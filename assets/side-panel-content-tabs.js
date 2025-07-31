
/**
 *  @class
 *  @function SidePanelContentTabs
 */
if (!customElements.get('side-panel-content-tabs')) {
  class SidePanelContentTabs extends HTMLElement {
    constructor() {
      super();
      this.buttons = this.querySelectorAll('button');
      this.panels = this.parentElement.querySelectorAll('.side-panel-content--tab-panel');
    }
    connectedCallback() {
      this.setupButtonObservers();
    }
    disconnectedCallback() {

    }
    setupButtonObservers() {
      this.buttons.forEach((item, i) => {
        item.addEventListener('click', (e) => {
          this.toggleActiveClass(i);
        });
      });
    }
    toggleActiveClass(i) {
      this.buttons.forEach((button) => {
        button.classList.remove('tab-active');
      });
      this.buttons[i].classList.add('tab-active');

      this.panels.forEach((panel) => {
        panel.classList.remove('tab-active');
      });
      this.panels[i].classList.add('tab-active');
    }
  }

  customElements.define('side-panel-content-tabs', SidePanelContentTabs);
}