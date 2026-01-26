import React, { useEffect } from 'react';
import { motion, useAnimation, useMotionValue, useTransform, useDragControls } from 'framer-motion';

/**
 * iOS Style Page Wrapper
 * - Handles Slide In/Out animations (Optimized)
 * - Implements "Swipe to Go Back" gesture
 */
const IOSPage = ({ children, title, onBack, rightButton, enableEnterAnimation = true, showBackButton = true, backIcon }) => {
    // Shared motion value for drag x position
    const x = useMotionValue(0);
    const controls = useAnimation();
    const dragControls = useDragControls();

    // Mapping x drag value to shadow opacity (Dimming effect)
    // 0px -> 100% opacity shadow (if we had a backdrop)
    // Actually, for the shadow *on the left of the card*, it stays constant usually, or fades out if we push it right?
    // Optimized Variants
    const variants = {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '100%', zIndex: 100 }
    };

    const transition = {
        duration: 0.4,
        ease: [0.32, 0.72, 0, 1] // iOS Standard Ease (Quartz)
    };

    // If enableEnterAnimation is false, we override the initial state in the component props
    const initialVariant = enableEnterAnimation ? "initial" : false;

    // Handle Drag End
    const handleDragEnd = async (event, info) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // Threshold tuning: > 60px or fast swipe
        if (offset > 60 || velocity > 200) {
            // Trigger Back
            // Use control.start to manually animate out with a "linear-ish" ease for exit
            await controls.start({
                x: "100%",
                transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } // iOS Curve
            });
            onBack();
        } else {
            // Reset - Snap back
            controls.start({
                x: 0,
                transition: { type: "spring", stiffness: 450, damping: 45 }
            });
        }
    };

    // Sync controls with variant changes if needed, but 'animate={controls}' usually means controls takes over.
    // However, when mounting, we want the "animate" variant to play.
    // 'controls' is imperative. If we pass 'controls' to animate, we MUST use controls.start.
    // To mix declarative (on mount) and imperative (drag), we should use the 'animate' prop with a string variant usually,
    // but drag needs dynamic values.
    // BEST PRACTICE: Use 'x' motion value directly or mixed.
    // Actually, passing `controls` to animate is fine, but we need to start it.
    // Alternative: Use `animate={x}` where x is state? No.
    // Optimized approach: Use declarative 'animate="animate"' for entry, but bind 'animate={controls}'? No, conflict.

    // We will stick to `useEffect` for the *initial* trigger if we use `controls`, OR we use state.
    // But `useEffect` caused the delay.
    // Solution: Don't use `controls` for the main `animate` prop. Use a variant string.
    // But Drag needs to override it.
    // Framer Motion allows `animate` to be a variant string. Drag updates `x` directly.
    // When drag ends, we use `animate` controls? 
    // Actually, `drag` handles x. When we release, we need to snap.

    // Let's try declarative first:
    // animate={isBack ? "exit" : "animate"} -> We don't have isBack state here, parent handles unmount.

    // HYBRID APPROACH:
    // 1. Mount with `initial="initial" animate="animate"`.
    // 2. Drag works automatically.
    // 3. onDragEnd -> if back, simple onBack() (parent unmounts).
    //    BUT we want to animate the slide OUT before unmounting?
    //    If parent unmounts, `AnimatePresence` triggers `exit`.
    //    So we don't need to manually animate to 100% *before* calling onBack, unless we want to ensure visual completion first.
    //    Actually, if we call onBack(), state changes, `IOSPage` gets removed. `AnimatePresence` sees it removed, triggers `exit` variant.
    //    So we DON'T need `controls.start` for the back action!
    //    We just need to release the drag.
    //    BUT `drag` leaves the element at the offset using `style={{x}}`.
    //    If we just call onBack, the exit animation starts from the current drag position? Yes, smart.

    return (
        <motion.div
            variants={variants}
            initial={enableEnterAnimation ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={transition}
            className="absolute inset-0 z-20 flex flex-col bg-[#F2F4F6] dark:bg-black shadow-2xl"
            style={{ x, willChange: "transform" }} // Hardware Acceleration
            // Drag Logic
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.6 }} // Feels tighter/better
            onDragEnd={handleDragEnd}
            dragListener={false} // Disable drag on main body content
            dragControls={dragControls}
        >
            {/* Edge Swipe Hit Area */}
            <div
                className="absolute left-0 top-0 bottom-0 w-8 z-50 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ touchAction: 'none' }}
            />

            {/* Header - V3 Soft Gradient Blur */}
            {title && (
                <div className="absolute top-0 left-0 right-0 z-30">
                    {/* Background Layer */}
                    <div
                        className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)'
                        }}
                    />

                    {/* Content */}
                    <div className="relative h-[50px] flex items-center justify-between px-2 pt-[env(safe-area-inset-top)] box-content transition-colors duration-300">
                        {showBackButton && (
                            <button
                                onClick={onBack}
                                className="p-2 flex items-center gap-1 text-gray-400 dark:text-gray-400 active:opacity-50 transition-opacity"
                            >
                                {backIcon ? backIcon : (
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                )}
                            </button>
                        )}
                        <span className="text-[17px] font-semibold text-gray-900 dark:text-white truncate max-w-[50%]">{title}</span>
                        <div className="w-[70px] flex justify-end">
                            {rightButton}
                        </div>
                    </div>
                </div>
            )}

            {/* Content w/ Scroll - Full Height, with padding-top to account for header */}
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden scroll-smooth" style={{ paddingTop: title ? 'calc(50px + env(safe-area-inset-top))' : 0 }}>
                {children}
            </div>

            {/* Smooth Shadow */}
            <motion.div
                className="absolute top-0 bottom-0 -left-6 w-6 bg-gradient-to-r from-transparent to-black/5 dark:to-black/30 pointer-events-none"
            />
        </motion.div>
    );
};

export default IOSPage;
