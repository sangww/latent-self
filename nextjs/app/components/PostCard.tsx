import Image from 'next/image';

interface Post {
  id: string;
  timestamp: string;
  story?: string;
  filename: string;
  type: string;
  likes: number;
  comments: number;
  shares: number;
}

interface PostCardProps {
  post: Post;
  basePath: string;
  customTimestamp?: string;
  useNST?: boolean;
}

export function formatTimestamp(timestamp: string, useNST: boolean = false) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  let timeString: string;
  if (diff < 60000) timeString = 'Just now';
  else if (diff < 3600000) timeString = `${Math.floor(diff / 60000)}m ago`;
  else if (diff < 86400000) timeString = `${Math.floor(diff / 3600000)}h ago`;
  else timeString = date.toLocaleDateString();
  
  // Add NST (Non-Singular Time) timezone for demo posts
  if (useNST) {
    return `${timeString}, NST (Non-Singular Time)`;
  }
  
  return timeString;
}

export default function PostCard({ post, basePath, customTimestamp, useNST = false }: PostCardProps) {
  const displayTimestamp = customTimestamp || post.timestamp;
  
  return (
    <article className="hover:shadow-2xl" style={{ backgroundColor: '#151318', overflow: 'hidden', borderRadius: '0.875rem', border: 'none', outline: 'none' }}>
      {/* Post Header */}
      <header style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ 
          width: '28px', 
          height: '28px', 
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 20%, #f093fb 40%, #4facfe 60%, #00f2fe 80%, #667eea 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradient 3s ease infinite',
          flexShrink: 0
        }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}>sangularity</span>
          <time style={{ color: '#9ca3af', fontSize: '12px' }}>{formatTimestamp(displayTimestamp, useNST)}</time>
        </div>
      </header>

      {/* Image */}
      <div className="relative w-full aspect-square overflow-hidden">
        <Image
          src={`${basePath}/db/${post.filename}`}
          alt={`AI Generated Art - ${post.type}`}
          fill
          className="object-cover"
          unoptimized
          style={{ filter: 'contrast(0.75) saturate(0.9) brightness(1.08) hue-rotate(-4deg)' }}
        />
        {/* Gingham-style overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(138,153,179,0.3) 0%, rgba(100,130,160,0.18) 50%, rgba(160,170,190,0.22) 100%)',
          mixBlendMode: 'overlay',
          pointerEvents: 'none'
        }}></div>
        {/* Additional haze */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, rgba(240,245,255,0.12) 50%, transparent 80%)',
          mixBlendMode: 'soft-light',
          pointerEvents: 'none'
        }}></div>
        {/* Vignette effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none'
        }}></div>
      </div>

      {/* Story */}
      {post.story && (
        <div style={{ padding: '12px 16px', fontSize: '13px', color: '#ffffff', lineHeight: '1.6' }}>
          <span style={{ fontWeight: 'bold', color: '#ffffff', marginRight: '8px' }}>sangularity</span>
          {post.story}
        </div>
      )}

      {/* Actions */}
      <footer style={{ padding: '12px 16px', gap: '12px' }} className="flex items-center">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }} className="text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span style={{ color: '#ffffff' }}>{post.likes}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }} className="text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ color: '#ffffff' }}>{post.comments}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }} className="text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          <span style={{ color: '#ffffff' }}>{post.shares}</span>
        </div>
      </footer>
    </article>
  );
}

