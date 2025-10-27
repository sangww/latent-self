'use client';

import { useEffect, useState } from 'react';
import PostCard, { formatTimestamp } from './components/PostCard';
import ScrollToTopButton from './components/ScrollToTopButton';

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

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadPosts();
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
      <main className="mx-auto gallery-main">
        {posts.length === 0 ? (
          <section className="text-center py-32" style={{ color: '#9ca3af' }}>
            <h2 className="text-2xl mb-2">Please wait...</h2>
          </section>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} basePath={basePath} />
            ))}
          </div>
        )}
      </main>
      
      <ScrollToTopButton onClick={handleScrollToTop} />
    </div>
  );
}
