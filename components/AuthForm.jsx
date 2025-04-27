// components/AuthForm.js
import React from 'react';
import { MdError } from "react-icons/md";
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpinner } from 'react-icons/fa'; // Import spinner

export default function AuthForm({ onSubmit, fields, buttonText, errorLabel, errorMessage, isLoading }) {
  return (
    <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onSubmit={onSubmit}
        className="w-full flex flex-col items-center max-w-sm" // Use max-width
    >
      {fields.map((field, index) => (
        <input
          key={index}
          name={field.name}
          type={field.type}
          placeholder={field.placeholder}
          required
          // Themed input styles
          className="w-full p-3 bg-primary border border-secondary-light rounded-md mb-4 text-textprimary placeholder-textsecondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50"
          disabled={isLoading} // Disable input while loading
        />
      ))}
      {/* Themed Error Message */}
      <AnimatePresence>
        {errorLabel && errorMessage && (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                // Themed error box
                className="w-full flex items-center justify-start text-left gap-2 mb-4 text-red-300 bg-red-900/30 p-2 rounded-md border border-red-700/50"
            >
              <MdError className="text-xl flex-shrink-0 text-red-400" />
              <p className="text-sm flex-grow">{errorMessage}</p>
            </motion.div>
        )}
       </AnimatePresence>
       {/* Themed Submit Button with Loading State */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-[48px] flex items-center justify-center bg-accent text-primary font-semibold py-3 rounded-md hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? <FaSpinner className="animate-spin text-lg" /> : buttonText}
      </button>
    </motion.form>
  );
}