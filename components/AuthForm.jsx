import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiAlertCircle, FiEye, FiEyeOff, FiLoader } from "react-icons/fi";

const Field = ({ field, disabled }) => {
  const [visible, setVisible] = useState(false);
  const isPassword = field.type === "password";
  const inputType = isPassword && visible ? "text" : field.type;

  return (
    <div>
      <label
        htmlFor={field.name}
        className="mb-1.5 block text-[12px] font-medium text-textsecondary"
      >
        {field.label}
      </label>
      <div className="relative">
        <input
          id={field.name}
          name={field.name}
          type={inputType}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          required
          disabled={disabled}
          className={`input ${isPassword ? "pr-11" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-textsecondary transition-colors hover:text-textprimary"
          >
            {visible ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        )}
      </div>
      {field.hint && <p className="mt-1.5 text-[11px] text-textsecondary/80">{field.hint}</p>}
    </div>
  );
};

export default function AuthForm({ onSubmit, fields, buttonText, errorMessage, isLoading }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {fields.map((field) => (
        <Field key={field.name} field={field} disabled={isLoading} />
      ))}

      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-200"
          >
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <p className="text-[13px] leading-relaxed">{errorMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button type="submit" disabled={isLoading} className="btn-primary h-12 w-full">
        {isLoading ? <FiLoader className="h-4 w-4 animate-spin" /> : buttonText}
      </button>
    </form>
  );
}
