'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sceneState, resetSceneState, type SceneBeat } from '@/lib/scene-state';
import { prefersReducedMotion } from '@/lib/device-tier';

/**
 * The single writer to sceneState.
 *
 * Mounted once on the home page. Creates one ScrollTrigger per storyboard beat,
 * each matched to a real section via `[data-beat]`, so the choreography stays
 * anchored to the content rather than to hardcoded pixel offsets that break the
 * moment copy changes length.
 *
 * Every trigger writes into the plain sceneState object. Nothing here calls
 * setState, so scrolling never re-renders React — the canvas picks the values
 * up inside useFrame on the shared ticker.
 */

/** Beats that exist as real sections in the DOM, in document order. */
const BEATS: SceneBeat[] = ['arrival', 'offerings', 'process', 'close'];

export function ScrollChoreography() {
  useEffect(() => {
    const reduced = prefersReducedMotion();
    sceneState.reducedMotion = reduced;
    resetSceneState();

    const ctx = gsap.context(() => {
      // ---- global progress + velocity -----------------------------------
      // One trigger over the whole document. velocityGetter is what drives
      // deformation in the hero object; normalised so the shader never sees an
      // unbounded number after a flick-scroll on a trackpad.
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          sceneState.progress = self.progress;
          sceneState.velocity = gsap.utils.clamp(-1, 1, self.getVelocity() / 2500);
        },
      });

      // ---- per-beat state ------------------------------------------------
      BEATS.forEach((beat) => {
        const el = document.querySelector<HTMLElement>(`[data-beat="${beat}"]`);
        if (!el) return;

        ScrollTrigger.create({
          trigger: el,
          start: 'top 80%',
          end: 'bottom 20%',
          onToggle: (self) => {
            if (self.isActive) sceneState.beat = beat;
          },
          onUpdate: (self) => {
            if (self.isActive) sceneState.beatProgress = self.progress;
          },
        });
      });

      // ---- offerings separation -------------------------------------------
      // Under reduced motion the forms are simply pre-separated and stay put —
      // the calm variant defined in Deliverable 1, not a frozen animation.
      const offerings = document.querySelector<HTMLElement>('[data-beat="offerings"]');
      if (offerings) {
        if (reduced) {
          sceneState.separation = 1;
        } else {
          ScrollTrigger.create({
            trigger: offerings,
            start: 'top 75%',
            end: 'center center',
            scrub: true,
            onUpdate: (self) => {
              sceneState.separation = self.progress;
            },
          });
        }
      }

      // ---- close: forms merge back ----------------------------------------
      const close = document.querySelector<HTMLElement>('[data-beat="close"]');
      if (close && !reduced) {
        ScrollTrigger.create({
          trigger: close,
          start: 'top bottom',
          end: 'center center',
          scrub: true,
          onUpdate: (self) => {
            sceneState.separation = 1 - self.progress;
          },
        });
      }
    });

    // Fonts and images change layout after first paint; without this the
    // triggers are measured against the wrong page height.
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);

    return () => {
      window.removeEventListener('load', onLoad);
      ctx.revert();
      resetSceneState();
    };
  }, []);

  return null;
}
