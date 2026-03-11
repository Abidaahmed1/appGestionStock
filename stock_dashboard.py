import streamlit as st
import pandas as pd
import psycopg2
import plotly.express as px
from datetime import datetime, timedelta
import os

# Configuration
st.set_page_config(page_title="AppStock - Dashboard Prédictif", layout="wide", page_icon="📦")

# CSS pour améliorer l'esthétique
st.markdown("""
    <style>
    .main {
        background-color: #f8f9fa;
    }
    .stMetric {
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    </style>
    """, unsafe_allow_html=True)

from sklearn.ensemble import RandomForestRegressor
import numpy as np

# Connection à la base de données PostgreSQL
@st.cache_resource
def get_connection():
    try:
        conn = psycopg2.connect(
            host="localhost",
            port="5432",
            database="gestionstock_db",
            user="postgres_bd",
            password="postgres_bd"
        )
        return conn
    except Exception as e:
        st.error(f"Impossible de se connecter à la base de données : {e}")
        return None

# --- MODULE MACHINE LEARNING ---

def train_consumption_model(df_piece):
    """Entraine un modèle Random Forest sur l'historique d'une pièce"""
    df = df_piece.copy()
    df['date'] = pd.to_datetime(df['date'])
    # On groupe par jour pour avoir la consommation quotidienne
    daily = df.groupby(df['date'].dt.date)['moved_qty'].sum().reset_index()
    daily['date'] = pd.to_datetime(daily['date'])
    
    daily['day'] = daily['date'].dt.day
    daily['month'] = daily['date'].dt.month
    daily['weekday'] = daily['date'].dt.weekday
    
    X = daily[['day', 'month', 'weekday']]
    y = daily['moved_qty']
    
    model = RandomForestRegressor(n_estimators=50, random_state=42)
    model.fit(X, y)
    return model

def predict_future_consumption(model, days=30):
    """Prédit la consommation totale pour les X prochains jours"""
    future_dates = pd.date_range(datetime.now(), periods=days)
    future_df = pd.DataFrame({
        "day": future_dates.day,
        "month": future_dates.month,
        "weekday": future_dates.weekday
    })
    predictions = model.predict(future_df)
    return max(0, predictions.sum()) # Pas de conso négative

# Récupération des données
@st.cache_data(ttl=60)
def fetch_stock_data():
    conn = get_connection()
    if not conn: return pd.DataFrame()
    query = """
    SELECT 
        p.id, 
        p.designation, 
        p.reference, 
        p.seuil_minimum, 
        p.seuil_maximum, 
        SUM(COALESCE(s.quantite, 0)) as current_qty,
        e.nom as entreprise_name,
        c.nom as category_name
    FROM piece_detachee p
    LEFT JOIN stock s ON s.piece_detachee_id = p.id
    LEFT JOIN entreprise e ON p.entreprise_id = e.id
    LEFT JOIN categorie c ON p.categorie_id = c.id
    WHERE p.archivee = false
    GROUP BY p.id, p.designation, p.reference, p.seuil_minimum, p.seuil_maximum, e.nom, c.nom
    """
    try:
        return pd.read_sql(query, conn)
    except Exception as e:
        st.warning(f"Erreur SQL: {e}")
        return pd.DataFrame()

@st.cache_data(ttl=60)
def fetch_movements_data():
    conn = get_connection()
    if not conn: return pd.DataFrame()
    query = """
    SELECT 
        m.date, 
        m.type_mouvement, 
        lm.quantite as moved_qty,
        p.id as piece_id,
        p.designation as piece_name,
        p.reference as piece_ref
    FROM mouvement_stock m
    JOIN ligne_mouvement lm ON lm.mouvement_id = m.id
    JOIN stock s ON lm.stock_id = s.id
    JOIN piece_detachee p ON s.piece_detachee_id = p.id
    ORDER BY m.date DESC
    """
    try:
        return pd.read_sql(query, conn)
    except Exception as e:
        return pd.DataFrame()

def process_movements(df_mov):
    if df_mov.empty: return df_mov
    exits = ["SORTIE_VENTE", "SORTIE_PERTE", "SORTIE_MAINTENANCE", "SORTIE_RETOUR"]
    df_mov['type'] = df_mov['type_mouvement'].apply(lambda x: 'SORTIE' if x in exits else 'ENTREE')
    return df_mov

# --- DASHBOARD ---
