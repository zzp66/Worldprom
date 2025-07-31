/**
 *  @class
 *  @function ThemeFooter
 */

if (!customElements.get('theme-footer')) {
  class ThemeFooter extends HTMLElement {
    constructor() {
      super();
      this.onResize = this.onResize.bind(this);
    }

    connectedCallback() {
      this.accordions = this.querySelectorAll('details');

      // Call onResize directly to set initial state based on window size
      this.onResize();

      // Add resize event listener
      window.addEventListener('resize', this.onResize);
    }

    disconnectedCallback() {
      // Remove resize event listener when element is removed
      window.removeEventListener('resize', this.onResize);
    }

    onResize() {
      this.accordions.forEach((accordion) => {
        if (window.innerWidth > 768) {
          accordion.setAttribute('open', '');
        } else {
          accordion.removeAttribute('open');
        }
      });
    }
  }

  customElements.define('theme-footer', ThemeFooter);
}
