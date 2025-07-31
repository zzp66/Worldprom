/**
 *  @class
 *  @function FeaturedProductCard
 */

if (!customElements.get('featured-product-card')) {
  class FeaturedProductCard extends HTMLElement {
    constructor() {
      super();

      this.tl = false;
      this.splittext = false;
    }
    connectedCallback() {
      if (document.body.classList.contains('animations-true') && typeof gsap !== 'undefined') {
        this.prepareAnimations();
      }
    }
    disconnectedCallback() {
      if (document.body.classList.contains('animations-true') && typeof gsap !== 'undefined') {
        this.tl.kill();
        this.splittext.revert();
      }
    }
    prepareAnimations() {
      let section = this,
        property = (gsap.getProperty("html", "--header-height") + gsap.getProperty("html", "--header-offset")) + 'px';

      section.tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top center"
        }
      });

      document.fonts.ready.then(function () {
        section.splittext = new SplitText(section.querySelectorAll('.featured-product-card--heading, .rte p'), {
          type: 'lines',
          linesClass: 'line-child'
        });
        section.mask = new SplitText(section.querySelectorAll('.featured-product-card--heading,  .rte p'), {
          type: 'lines',
          linesClass: 'line-parent'
        });
        section.tl
          .fromTo(section.querySelector('.inline-badge'), {
            opacity: 0
          }, {
            duration: 0.25,
            opacity: 1
          }, '>-=0.15');
        section.tl
          .fromTo(section.querySelector('.subheading'), {
            opacity: 0
          }, {
            duration: 0.5,
            opacity: 1
          }, '>-=0.3');
        section.tl
          .from(section.querySelectorAll('.featured-product-card--heading .line-child'), {
            duration: 0.75,
            yPercent: '100',
            stagger: 0.05,
            rotation: '2deg'
          }, '>-=0.3');
        section.tl
          .from(section.querySelectorAll('.rte p .line-child'), {
            duration: 0.5,
            yPercent: '100',
            stagger: 0.02
          }, '>-=0.3');
        section.tl
          .fromTo(section.querySelectorAll('.button'), {
            autoAlpha: 0
          }, {
            duration: 0.5,
            stagger: 0.05,
            autoAlpha: 1
          });
      });

      if (section.querySelector('.thb-parallax-image')) {
        gsap.fromTo(section.querySelectorAll('.thb-parallax-image'), {
          y: '-8%'
        }, {
          y: '8%',
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            scrub: 1,
            start: () => `top bottom`,
            end: () => `bottom top+=${property}`,
            onUpdate: () => {
              property = (gsap.getProperty("html", "--header-height") + gsap.getProperty("html", "--header-offset")) + 'px';
            }
          }
        });
      }
      if (Shopify.designMode) {
        section.tl.scrollTrigger.refresh();
      }
    }
  }
  customElements.define('featured-product-card', FeaturedProductCard);
}