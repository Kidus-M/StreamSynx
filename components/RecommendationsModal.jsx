import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose } from "react-icons/io5";
import MovieCard from "./MinimalCard"; // Adjust path if needed

// Re-use the same variants as DetailsModal
const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.3 } },
};

const modalVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, y: 50, scale: 0.95, transition: { duration: 0.3, ease: "easeInOut" } },
};

const RecommendationsModal = ({ onClose, recommendedMovies, router }) => {
    // Stop background scroll when modal is open
    React.useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    const handleRecClick = (recMovieId) => {
        onClose(); // Close the modal first
        // if (!displayData.id) return;
        // const url = displayData.media_type === "tv"
        //     ? `/watchTv?tv_id=${displayData.id}` // Link to detail page
        //     : `/watch?movie_id=${displayData.id}`; // Link to detail page
        // router.push(url); // Then navigate
    };

    return (
        <AnimatePresence>
            <motion.div
                key="recs-modal-backdrop"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-md p-4"
                onClick={onClose}
            >
                <motion.div
                    key="recs-modal-content"
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative w-full max-w-4xl max-h-[90vh] bg-secondary rounded-lg shadow-xl border border-secondary-light flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-secondary-light">
                        <h2 className="text-xl font-semibold text-textprimary">
                            Recommended for You
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-textsecondary hover:text-textprimary transition-colors"
                            aria-label="Close"
                        >
                            <IoClose size={24} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
                        {recommendedMovies.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                {recommendedMovies.map((recMovie) => (
                                    <MovieCard
                                        key={recMovie.id}
                                        movie={recMovie}
                                        onClick={() => handleRecClick(recMovie.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-textsecondary text-center py-10 italic">
                                No recommendations found for this movie.
                            </p>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default RecommendationsModal;