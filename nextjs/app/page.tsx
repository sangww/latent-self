'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Post {
  id: string;
  timestamp: string;
  prompt: string;
  story?: string;
  filename: string;
  type: string;
  likes: number;
  comments: number;
  shares: number;
}

export default function Gallery() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Determine basePath based on whether we're in static export or server mode
  const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/latent-self') ? '/latent-self' : '';

  useEffect(() => {
    loadPosts();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPosts, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      
      // Try to load from static posts.json first (for static exports)
      try {
        const staticResponse = await fetch(`${basePath}/posts.json`);
        if (staticResponse.ok) {
          const data = await staticResponse.json();
          console.log('Loaded posts from static file:', data);
          setPosts(data);
          return;
        }
      } catch (e) {
        // Static file doesn't exist, try API
      }
      
      // Fallback to API (for server mode)
      const response = await fetch(`${basePath}/api/posts`);
      const data = await response.json();
      console.log('Loaded posts from API:', data);
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#000000' }}>
        <div className="text-center">
          <h1 className="text-2xl mb-4" style={{ color: '#ffffff' }}>Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#000000' }}>
      {/* Main Content */}
      <main className="mx-auto" style={{ width: '60%', paddingTop: '32px', paddingBottom: '32px' }}>
        {posts.length === 0 ? (
          <section className="text-center py-32" style={{ color: '#9ca3af' }}>
            <h2 className="text-2xl mb-2">Please wait...</h2>
          </section>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {posts.map((post) => (
              <article key={post.id} className="hover:shadow-2xl" style={{ backgroundColor: '#1f1f1f', overflow: 'hidden', borderRadius: '1.5rem', border: 'none', outline: 'none' }}>
                {/* Post Header */}
                <header style={{ padding: '24px 32px' }}>
                  <time style={{ color: '#ffffff', fontSize: '12px' }}>{formatTimestamp(post.timestamp)}</time>
                </header>

                {/* Image */}
                <div className="relative w-full aspect-square overflow-hidden">
                  <Image
                    src={`${basePath}/db/${post.filename}`}
                    alt={`AI Generated Art - ${post.type}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Story */}
                {post.story && (
                  <div style={{ padding: '24px 32px', fontSize: '16px', color: '#ffffff', lineHeight: '1.6' }}>
                    {post.story}
                  </div>
                )}

                {/* Actions */}
                <footer style={{ padding: '24px 32px', gap: '12px' }} className="flex items-center">
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
