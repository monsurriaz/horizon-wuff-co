// @ts-nocheck
(() => {
  const state = {
    qty: 0,
    scents: [],
    sizeLabel: '',
    blockId: ''
  };

  // @ts-ignore
  function safeQS(selector) {
    return document.querySelector(selector);
  }

  // @ts-ignore
  function safeQSA(selector) {
    return document.querySelectorAll(selector);
  }

  // @ts-ignore
  function startFlow(cardEl) {
    if (!cardEl) return;

    try {
      const scentsJson = cardEl.dataset.scents;
      const qty = parseInt(cardEl.dataset.qty, 10);
      const sizeLabel = cardEl.dataset.sizeLabel;
      const blockId = cardEl.dataset.blockId;

      if (!scentsJson || !qty || !sizeLabel) {
        console.warn('[Great Offer] Missing card data attributes');
        return;
      }

      state.scents = JSON.parse(scentsJson);
      state.qty = qty;
      state.sizeLabel = sizeLabel;
      state.blockId = blockId;
    } catch (e) {
      console.error('[Great Offer] Failed to parse card data:', e);
      return;
    }

    rebuildModal();
    updateSelectionCount();
    const modal = safeQS('#go-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    const modal = safeQS('#go-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    document.body.style.overflow = '';
  }

  function rebuildModal() {
    const grid = safeQS('#go-scent-grid');
    const title = safeQS('#go-modal-title');
    const subtitle = safeQS('#go-modal-subtitle');
    const progressTotal = safeQS('#go-progress-total');

    if (!grid || !title || !subtitle) return;

    grid.innerHTML = '';

    state.scents.forEach((scent) => {
      const item = document.createElement('div');
      item.className = 'go-scent-item';
      // @ts-ignore
      item.dataset.variantId = scent.id;
      // @ts-ignore
      if (!scent.available) {
        item.classList.add('go-scent-item--unavailable');
      }

      const imageImg = document.createElement('img');
      imageImg.className = 'go-scent-image';
      // @ts-ignore
      imageImg.src = scent.image;
      // @ts-ignore
      imageImg.alt = scent.title;

      const infoDiv = document.createElement('div');
      infoDiv.className = 'go-scent-info';

      const nameSpan = document.createElement('div');
      nameSpan.className = 'go-scent-name';
      // @ts-ignore
      nameSpan.textContent = scent.title;

      const variantSpan = document.createElement('div');
      variantSpan.className = 'go-scent-variant';
      // @ts-ignore
      variantSpan.textContent = state.sizeLabel;

      infoDiv.appendChild(nameSpan);
      infoDiv.appendChild(variantSpan);

      const stepperDiv = document.createElement('div');
      stepperDiv.className = 'go-stepper';

      const minusBtn = document.createElement('button');
      minusBtn.className = 'go-stepper-btn go-minus';
      minusBtn.type = 'button';
      minusBtn.textContent = '−';
      minusBtn.disabled = !scent.available;

      const valSpan = document.createElement('div');
      valSpan.className = 'go-stepper-val';
      valSpan.textContent = '0';

      const plusBtn = document.createElement('button');
      plusBtn.className = 'go-stepper-btn go-plus';
      plusBtn.type = 'button';
      plusBtn.textContent = '+';
      plusBtn.disabled = !scent.available;

      stepperDiv.appendChild(minusBtn);
      stepperDiv.appendChild(valSpan);
      stepperDiv.appendChild(plusBtn);

      item.appendChild(imageImg);
      item.appendChild(infoDiv);
      item.appendChild(stepperDiv);
      grid.appendChild(item);

      minusBtn.addEventListener('click', () => handleStepperChange(item, -1));
      plusBtn.addEventListener('click', () => handleStepperChange(item, 1));
    });

    if (progressTotal) {
      progressTotal.textContent = state.qty;
    }
    title.textContent = `Choose your ${state.qty} × ${state.sizeLabel} bottles`;
    subtitle.textContent = `Use + and − to pick your scents. You can choose ${state.qty} of the same if you like.`;
  }

  function getTotalQuantity() {
    let total = 0;
    safeQSA('#go-scent-grid .go-stepper-val').forEach((val) => {
      total += parseInt(val.textContent) || 0;
    });
    return total;
  }

  // @ts-ignore
  function handleStepperChange(item, direction) {
    const valSpan = item.querySelector('.go-stepper-val');
    if (!valSpan) return;

    const currentVal = parseInt(valSpan.textContent) || 0;
    const newVal = Math.max(0, currentVal + direction);
    valSpan.textContent = newVal;

    if (newVal > 0) {
      item.classList.add('has-qty');
    } else {
      item.classList.remove('has-qty');
    }

    updateSelectionCount();
  }

  function updateSelectionCount() {
    const total = getTotalQuantity();
    const countEl = safeQS('#go-selection-count');
    const btnEl = safeQS('#go-confirm-btn');
    const progressN = safeQS('#go-progress-n');
    const progressFill = safeQS('#go-progress-fill');

    if (!countEl || !btnEl) return;

    countEl.textContent = `${total} of ${state.qty} selected`;
    btnEl.disabled = total !== state.qty;

    if (progressN) {
      progressN.textContent = total;
    }

    if (progressFill && state.qty > 0) {
      const percentage = Math.min(100, (total / state.qty) * 100);
      progressFill.style.width = percentage + '%';
    }

    // Disable all + buttons when limit reached
    safeQSA('#go-scent-grid .go-plus').forEach((btn) => {
      const item = btn.closest('.go-scent-item');
      // @ts-ignore
      btn.disabled = total >= state.qty || !item.dataset.variantId;
    });
  }

  function handleConfirm() {
    const btnEl = safeQS('#go-confirm-btn');
    if (!btnEl) return;

    const total = getTotalQuantity();
    if (total !== state.qty) {
      return;
    }

    const items = [];
    safeQSA('#go-scent-grid .go-scent-item').forEach((item) => {
      const qty = parseInt(item.querySelector('.go-stepper-val').textContent) || 0;
      if (qty > 0) {
        // @ts-ignore
        items.push({
          id: parseInt(item.dataset.variantId, 10),
          quantity: qty
        });
      }
    });

    const cartComponents = safeQSA('cart-items-component[data-section-id]');
    const sectionIds = Array.from(cartComponents).map(
      (el) => el.dataset.sectionId
    );

    const payload = {
      items: items,
      sections: sectionIds
    };

    btnEl.disabled = true;
    const originalText = btnEl.textContent;
    btnEl.textContent = 'Adding...';

    removeExistingError();

    const cartAddUrl = window.Shopify?.routes?.cart_add_url || '/cart/add.js';

    fetch(cartAddUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response structure');
        }

        if (data.status) {
          showError(data.message || 'Could not add to cart. Please try again.');
          resetButton(btnEl, originalText);
          return;
        }

        closeModal();
        setTimeout(() => {
          dispatchCartAddEvent(state.qty, data.sections || sectionIds);
        }, 400);
        resetButton(btnEl, originalText);
      })
      .catch((err) => {
        console.error('[Great Offer] ATC error:', err);
        const errorMsg = err?.message || 'Something went wrong. Please try again.';
        showError(errorMsg);
        resetButton(btnEl, originalText);
      });
  }

  // @ts-ignore
  function resetButton(btnEl, text) {
    if (!btnEl) return;
    btnEl.disabled = false;
    btnEl.textContent = text || 'Add to cart';
  }

  // @ts-ignore
  function showError(message) {
    removeExistingError();
    const footer = safeQS('.go-modal-footer');
    if (!footer) return;

    const errorEl = document.createElement('p');
    errorEl.className = 'go-atc-error';
    errorEl.textContent = message;
    footer.appendChild(errorEl);
  }

  function removeExistingError() {
    const existing = safeQS('.go-atc-error');
    if (existing) {
      existing.remove();
    }
  }

  // @ts-ignore
  function dispatchCartAddEvent(itemCount, sections) {
    // Event name matches CartAddEvent.eventName (ThemeEvents.cartUpdate = 'cart:update')
    const event = new CustomEvent('cart:update', {
      bubbles: true,
      detail: {
        resource: {},
        sourceId: '',
        data: {
          source: 'product-form-component',
          itemCount: itemCount,
          sections: sections || []
        }
      }
    });
    document.dispatchEvent(event);
  }

  function initEventListeners() {
    const cards = safeQS('.go-cards');
    if (cards) {
      // @ts-ignore
      cards.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="go-start-flow"]');
        if (btn) {
          const card = btn.closest('.go-card');
          startFlow(card);
        }
      });
    }

    const confirmBtn = safeQS('#go-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', handleConfirm);
    }

    const closeBtn = safeQS('#go-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    const modal = safeQS('#go-modal');
    if (modal) {
      // @ts-ignore
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventListeners);
  } else {
    initEventListeners();
  }

  // @ts-ignore
  window.goStartFlow = startFlow;
  // @ts-ignore
  window.goCloseModal = closeModal;
})();
