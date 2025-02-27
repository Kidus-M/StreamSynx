import { useState } from "react";
import { MdError } from "react-icons/md";

export default function AuthForm({ onSubmit, fields, buttonText, errorLabel, errorMessage }) {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-full max-sm:px-4">
      <form onSubmit={onSubmit} className="w-full flex flex-col items-center">
        {fields.map((field, index) => (
          <input
            key={index}
            name={field.name}
            type={field.type}
            placeholder={field.placeholder}
            className="md:w-96 w-80 p-3 border rounded mb-4 text-gray-700"
          />
        ))}
        <div className={`w-full items-center justify-start gap-2 mb-4 text-red-600 ${errorLabel ? 'flex' : 'hidden'}`}>
          <MdError className="text-xl" />
          <p className="text-sm">{errorMessage}</p>
        </div>
        <button type="submit" className="md:w-96 w-80 bg-primary text-white py-3 rounded mb-4 font-poppins">
          {buttonText}
        </button>
      </form>
    </div>
  );
}