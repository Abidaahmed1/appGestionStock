import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent {
  @Input() show: boolean = false;
  @Input() title: string = 'Quitter cette page ?';
  @Input() message: string = 'Si vous quittez, vos changements non sauvegardés seront annulés.';
  @Input() confirmText: string = 'Rester ici';
  @Input() cancelText: string = 'Quitter et annuler les changements';
  @Input() type: 'warning' | 'info' | 'success' = 'warning';
  
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
