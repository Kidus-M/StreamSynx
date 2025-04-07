// components/StatsCard.js

// Optional: If you want icons later, import them
// import { FaUsers, FaFilm, FaTv, FaHeart, FaTags, FaQuestionCircle } from 'react-icons/fa';

export default function StatsCard({ title, value }) {
  // Optional: Map title to an icon (Example)
  // const iconMap = { Buddies: FaUsers, 'Movies Watched': FaFilm, 'Episodes Watched': FaTv, 'Favorite Movies': FaHeart, 'Favorite Episodes': FaHeart, 'Top Genre': FaTags };
  // const Icon = iconMap[title] || FaQuestionCircle; // Default icon if no match

return (
  // Themed background, border, padding, text alignment, shadow, transition
  <div className="bg-secondary-light p-4 rounded-lg border border-secondary text-center shadow-md transition-colors duration-200 hover:border-secondary-light/80">
     {/* Optional: Icon Display */}
     {/* <Icon className="mx-auto mb-2 text-accent text-2xl opacity-80" /> */}
     {/* Themed title text */}
    <p className="text-textsecondary text-xs sm:text-sm font-medium mb-1 uppercase tracking-wider">{title}</p>
     {/* Themed value text, truncate long values */}
    <p className="text-textprimary text-xl sm:text-2xl font-bold truncate" title={String(value)}> {/* Ensure value is string for title */}
      {value}
    </p>
  </div>
);
}