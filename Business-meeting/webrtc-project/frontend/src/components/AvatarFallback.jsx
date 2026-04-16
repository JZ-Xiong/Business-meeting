const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-pink-500 to-fuchsia-600',
];

function getGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(/[-_\s]/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Fallback avatar when camera is off — shows user initials on a gradient background.
 */
export default function AvatarFallback({ name, size = 'md' }) {
  const gradient = name ? getGradient(name) : 'from-gray-500 to-gray-600';
  const initials = getInitials(name);

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-20 h-20 text-2xl',
    lg: 'w-32 h-32 text-4xl',
    full: 'w-full h-full text-3xl',
  };

  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${gradient} ${sizeClasses[size] || sizeClasses.md} rounded-full font-bold text-white select-none`}>
      {initials}
    </div>
  );
}
