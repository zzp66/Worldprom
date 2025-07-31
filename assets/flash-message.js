/**
 *  @class
 *  @function FlashMessage
 */
if (!customElements.get('flash-message')) {
  class FlashMessage extends HTMLElement {
    constructor() {
      super();
      this.close_button = this.querySelector('button');
      this.id = this.dataset.id;
      this.close_behaviour = this.dataset.closeButton;
      this.flashMessages = JSON.parse(window.sessionStorage.getItem('flash-messages')) || [];
    }

    connectedCallback() {
      if (this.close_behaviour == 'close_forever') {
        if (this.flashMessages && this.flashMessages?.includes(this.id)) {
          return;
        }
      }
      this.removeAttribute('hidden');
      this.close_button?.addEventListener('click', this.onClick.bind(this));
    }

    onClick() {
      if (this.close_behaviour == 'close_forever') {
        this.flashMessages.unshift(this.id);
        window.sessionStorage.setItem('flash-messages', JSON.stringify(this.flashMessages));
      }
      this.remove();
    }
  }
  customElements.define('flash-message', FlashMessage);
}
