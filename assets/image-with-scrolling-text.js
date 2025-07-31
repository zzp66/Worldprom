/**
 *  @class
 *  @function ImageScrollingText
 */

if (!customElements.get('image-with-scrolling-text')) {
  class ImageScrollingText extends HTMLElement {
    constructor() {
      super();

      this.tl = false;
      this.splittext = false;
      this.img = this.querySelector('.image-with-scrolling-text--bg img');
    }
    connectedCallback() {
      if (document.body.classList.contains('animations-true') && typeof gsap !== 'undefined') {
        this.prepareAnimations();
      }
      window.addEventListener('load', () => {
        if (this.img) {
          lazySizes.loader.unveil(this.img);
        }
      });
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
        gsap.set(section.querySelectorAll('.image-with-scrolling-text--content-inner'), { visibility: 'visible' });
        section.splittext = new SplitText(section.querySelectorAll('.image-with-scrolling-text--heading, .rte p'), {
          type: 'lines',
          linesClass: 'line-child'
        });
        section.mask = new SplitText(section.querySelectorAll('.image-with-scrolling-text--heading,  .rte p'), {
          type: 'lines',
          linesClass: 'line-parent'
        });
        section.tl
          .from(section.querySelector('.image-with-scrolling-text--bg'), {
            scale: 1.2,
            duration: 1
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
          .from(section.querySelectorAll('.image-with-scrolling-text--heading .line-child'), {
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
        if (section.querySelectorAll('.button')) {
          let i = 1;
          section.querySelectorAll('.button').forEach((item) => {
            section.tl.fromTo(item, {
              autoAlpha: 0
            }, {
              duration: 0.5,
              autoAlpha: 1
            }, '>-=' + (i - 1) * 0.1);
            i++;
          });
        }

      });
      if (section.querySelector('.thb-parallax-image')) {
        gsap
          .fromTo(section.querySelectorAll('.thb-parallax-image'), {
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
        gsap
          .fromTo(section.querySelectorAll('.image-with-scrolling-text--overlay-image'), {
            yPercent: '-10'
          }, {
            yPercent: '10',
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              scrub: 1
            }
          });
      }
      if (Shopify.designMode) {
        section.tl.scrollTrigger.refresh();
      }
    }
  }
  customElements.define('image-with-scrolling-text', ImageScrollingText);
}