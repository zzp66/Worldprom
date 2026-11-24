/**
 *  @class
 *  @function MaxHeight
 */
if (!customElements.get('max-height')) {
  class MaxHeight extends HTMLElement {
    constructor() {
      super();
      this.content = this.querySelector('.max-height--inner-content');
      this.toggle = this.querySelector('.max-height--toggle');
      this.max = this.dataset.max;
    }

    connectedCallback() {
      this.toggle.addEventListener('click', this.onClick.bind(this));
      window.addEventListener('resize', this.checkVisible.bind(this));


      this.checkVisible();
      if (this.hasAttribute('data-line-clamp') && document.fonts) {
        document.fonts.ready.then(() => {
          if (this.isConnected) this.checkVisible();
        });
      }
    }

    checkVisible() {
      if (this.hasAttribute('data-line-clamp')) {
        this.checkLineClamp();
        return;
      }
      if (this.content.offsetHeight > this.max) {
        this.showToggle();
      } else {
        this.hideToggle();
      }
    }
    checkLineClamp() {
      // Measure at the full available width, before reserving room for the toggle.
      this.hideToggle();
      const lines = parseInt(getComputedStyle(this).getPropertyValue('--collapsed-lines'), 10) || 2;
      const lineHeight = parseFloat(getComputedStyle(this.content).lineHeight);
      if (this.content.scrollHeight > lineHeight * lines + 1) {
        this.showToggle();
      } else {
        this.classList.remove('max-height--enabled');
      }
      this.toggle.setAttribute('aria-expanded', String(this.classList.contains('max-height--enabled')));
    }
    showToggle() {
      this.classList.add('max-height--active');
    }
    hideToggle() {
      this.classList.remove('max-height--active');
    }
    onClick() {
      this.classList.toggle('max-height--enabled');
      this.toggle.setAttribute('aria-expanded', String(this.classList.contains('max-height--enabled')));
    }
  }
  customElements.define('max-height', MaxHeight);
}
