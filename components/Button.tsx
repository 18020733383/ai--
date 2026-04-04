import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles =
    "font-serif tracking-wider uppercase border transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100";
  
  const variants = {
    primary: "bg-stone-800 border-stone-600 text-stone-200 hover:bg-stone-700 hover:border-stone-500 shadow-md",
    secondary: "bg-transparent border-stone-600 text-stone-400 hover:text-stone-200 hover:border-stone-400",
    danger: "bg-blood border-red-900 text-white hover:bg-red-800",
    gold: "bg-yellow-700 border-yellow-500 text-yellow-100 hover:bg-yellow-600 shadow-lg shadow-yellow-900/20"
  };

  const sizes = {
    sm: "px-3 py-1 text-xs",
    md: "px-6 py-2 text-sm",
    lg: "px-8 py-3 text-base font-bold"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};