// src/utils/lazyLoad.js (or a similar path in your project)

document.addEventListener("DOMContentLoaded", function() {
    const lazyItems = document.querySelectorAll("img[data-src], iframe[data-src]");

    const observerOptions = {
        root: null, // Observing intersection with the viewport
        rootMargin: "0px 0px 100px 0px", // Load when 100px from the bottom of the viewport
        threshold: 0 // As soon as even 1 pixel of the target is visible
    };

    const itemObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;

                if (target.tagName === 'IMG' && target.dataset.src) {
                    target.src = target.dataset.src;
                    if (target.dataset.srcset) {
                        target.srcset = target.dataset.srcset;
                    }
                } else if (target.tagName === 'IFRAME' && target.dataset.src) {
                    target.src = target.dataset.src;
                }

                // Optional: Remove data-attributes if you don't need them after loading
                delete target.dataset.src;
                if (target.dataset.srcset) {
                    delete target.dataset.srcset;
                }

                observer.unobserve(target); // Stop observing once loaded
            }
        });
    }, observerOptions);

    lazyItems.forEach(item => {
        itemObserver.observe(item);
    });
});