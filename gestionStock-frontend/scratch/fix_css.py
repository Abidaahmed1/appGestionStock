import os

file_path = r"d:\projetPfe\appGestionStock\gestionStock-frontend\src\app\auditeur\components\audit-hub\audit-hub.component.css"

with open(file_path, "rb") as f:
    lines = f.readlines()

# Keep lines until the first one that contains null bytes or where the corruption starts
# We know line 4671 is corrupted. (0-indexed it's 4670)
clean_lines = lines[:4670]

# Construct the clean Neo Multi Select CSS
neo_css = """
/* Neo Multi Select */
.neo-multi-select {
    position: relative;
    width: 100%;
}

.neo-select-header {
    height: 3.5rem;
    padding: 0 1.25rem;
    background: var(--hub-card);
    border: 2px solid var(--hub-border);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.neo-multi-select.opened .neo-select-header {
    border-color: var(--hub-primary);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    box-shadow: 0 8px 24px var(--hub-primary-soft);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex: 1;
    min-width: 0;
}

.search-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: #94a3b8;
    flex-shrink: 0;
}

.selected-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--hub-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.chevron-icon {
    width: 1.1rem;
    height: 1.1rem;
    color: #94a3b8;
    transition: transform 0.3s;
}

.chevron-icon.rotate {
    transform: rotate(180deg);
}

.neo-select-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--hub-card);
    border: 2px solid var(--hub-border);
    border-top: none;
    border-bottom-left-radius: 14px;
    border-bottom-right-radius: 14px;
    z-index: 1000;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    max-height: 400px;
    overflow: hidden;
}

.dropdown-filter-bar {
    padding: 1rem;
    background: #f8fafc;
    border-bottom: 1px solid var(--hub-border);
}

.filter-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.filter-input-wrapper input {
    width: 100%;
    height: 2.8rem;
    padding: 0 1rem;
    padding-right: 2.5rem;
    background: #fff;
    border: 1px solid var(--hub-border);
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
}

.clear-search {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    font-size: 1rem;
    color: #94a3b8;
    cursor: pointer;
}

.dropdown-options-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
}

.option-row {
    padding: 0.75rem 0.85rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: 0.2s;
    margin-bottom: 2px;
}

.option-row:hover {
    background: #f1f5f9;
}

.option-row.is-active {
    background: var(--hub-primary-soft);
}

.option-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.option-name {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--hub-text);
}

.option-meta {
    font-size: 0.75rem;
    font-weight: 500;
    color: #94a3b8;
}

.option-checkbox {
    width: 1.4rem;
    height: 1.4rem;
    border: 2px solid #e2e8f0;
    border-radius: 6px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.option-checkbox.checked {
    background: #10b981;
    border-color: #10b981;
    color: white;
}

.option-checkbox.checked svg {
    width: 0.8rem;
    height: 0.8rem;
}

.no-results-cat {
    padding: 2rem;
    text-align: center;
    font-size: 0.85rem;
    color: #94a3b8;
}

.animate-slide-up {
    animation: slideUp 0.3s cubic-bezier(0.19, 1, 0.22, 1);
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Dark Mode Support Selection */
:host-context(.dark-theme) .neo-select-header,
:host-context([data-theme="dark"]) .neo-select-header {
    background: #111111;
    border-color: #27272a;
}

:host-context(.dark-theme) .neo-select-dropdown,
:host-context([data-theme="dark"]) .neo-select-dropdown {
    background: #111111;
    border-color: #27272a;
}

:host-context(.dark-theme) .dropdown-filter-bar,
:host-context([data-theme="dark"]) .dropdown-filter-bar {
    background: #18181b;
    border-bottom-color: #27272a;
}

:host-context(.dark-theme) .filter-input-wrapper input,
:host-context([data-theme="dark"]) .filter-input-wrapper input {
    background: #09090b;
    border-color: #27272a;
    color: #fff;
}

:host-context(.dark-theme) .option-row:hover,
:host-context([data-theme="dark"]) .option-row:hover {
    background: #18181b;
}

:host-context(.dark-theme) .option-checkbox,
:host-context([data-theme="dark"]) .option-checkbox {
    background: #000;
    border-color: #3f3f46;
}
"""

with open(file_path, "wb") as f:
    for line in clean_lines:
        f.write(line)
    f.write(neo_css.encode("utf-8"))

print("CSS file fixed successfully.")
