import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose } from "react-icons/io5";

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

const DetailsModal = ({ onClose, movie, cast, director, trailerKey }) => {
    // Stop background scroll when modal is open
    React.useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    return (
        <AnimatePresence>
            <motion.div
                key="details-modal-backdrop"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-md p-4"
                onClick={onClose}
            >
                <motion.div
                    key="details-modal-content"
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative w-full max-w-3xl max-h-[90vh] bg-secondary rounded-lg shadow-xl border border-secondary-light flex flex-col"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-secondary-light">
                        <h2 className="text-xl font-semibold text-textprimary">
                            Details for {movie.title}
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
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
                        {/* Overview */}
                        <div>
                            <h3 className="text-lg font-semibold text-textprimary mb-2">
                                Overview
                            </h3>
                            <p className="text-sm text-textsecondary leading-relaxed">
                                {movie.overview}
                            </p>
                        </div>

                        {/* Director */}
                        {director && (
                            <div>
                                <h3 className="text-lg font-semibold text-textprimary mb-2">
                                    Director
                                </h3>
                                <p className="text-sm text-textsecondary">{director.name}</p>
                            </div>
                        )}

                        {/* Cast Section */}
                        {cast.length > 0 && (
                            <div className="pt-4 border-t border-secondary-light">
                                <h3 className="text-lg font-semibold text-textprimary mb-3">
                                    Top Cast
                                </h3>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                    {cast.map((actor) => (
                                        <div key={actor.cast_id} className="text-center">
                                            <img
                                                src={
                                                    actor.profile_path
                                                        ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                                                        : "/placeholder.jpg"
                                                }
                                                alt={actor.name}
                                                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover mx-auto mb-1 shadow-md border-2 border-secondary-light"
                                            />
                                            <p className="text-xs md:text-sm text-textprimary font-medium line-clamp-1">
                                                {actor.name}
                                            </p>
                                            <p className="text-xs text-textsecondary line-clamp-1">
                                                {actor.character}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trailer Section */}
                        {trailerKey && (
                            <div className="pt-4 border-t border-secondary-light">
                                <h3 className="text-lg font-semibold text-textprimary mb-3">
                                    Trailer
                                </h3>
                                <div className="relative aspect-video rounded-lg overflow-hidden shadow-md border border-secondary-light">
                                    <iframe
                                        src={`https://www.youtube.com/embed/${trailerKey}`}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full"
                                        title={`${movie.title} Trailer`}
                                    ></iframe>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DetailsModal;