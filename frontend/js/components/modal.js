/* ==========================================================================
   modal.js
   ========================================================================== */

import { state } from '../state.js';

export function openModal(title, body, confirmAction = null, confirmLabel = 'Confirm') {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').textContent = body;
      state.modalConfirmAction = typeof confirmAction === 'function' ? confirmAction : null;
      const confirmButton = document.getElementById('modalConfirmBtn');
      confirmButton.textContent = confirmLabel;
      confirmButton.classList.toggle('danger-action', !!state.modalConfirmAction && confirmLabel === 'Delete');
      document.getElementById('modalOverlay').classList.add('open');
    }

export function confirmModalAction() {
      const action = state.modalConfirmAction;
      closeModal();
      if (action) action();
    }

export function closeModal() {
      document.getElementById('modalOverlay').classList.remove('open');
      state.modalConfirmAction = null;
    }
