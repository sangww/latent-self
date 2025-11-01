'use client';

import { useEffect, useState, useCallback } from 'react';
import PostCard from './components/PostCard';
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

const POSTS_PER_LOAD = 5;

export default function Gallery() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [displayedCount, setDisplayedCount] = useState(POSTS_PER_LOAD);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
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
          setAllPosts(data);
          setDisplayedCount(POSTS_PER_LOAD);
          return;
        }
      } catch (e) {
        // Static file doesn't exist, try API
      }
      
      // Fallback to API (for server mode)
      const response = await fetch(`${basePath}/api/posts`);
      const data = await response.json();
      console.log('Loaded posts from API:', data);
      setAllPosts(data);
      setDisplayedCount(POSTS_PER_LOAD);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMorePosts = useCallback(() => {
    if (isLoadingMore || displayedCount >= allPosts.length) return;
    
    setIsLoadingMore(true);
    // Simulate slight delay for smooth loading
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + POSTS_PER_LOAD, allPosts.length));
      setIsLoadingMore(false);
    }, 300);
  }, [allPosts.length, displayedCount, isLoadingMore]);

  useEffect(() => {
    const handleScroll = () => {
      // Check if user is near the bottom (within 200px)
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      if (scrollTop + windowHeight >= documentHeight - 200) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMorePosts]);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadPosts();
  };

  const displayedPosts = allPosts.slice(0, displayedCount);
  const hasMore = displayedCount < allPosts.length;

  if (isLoading && allPosts.length === 0) {
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
        {displayedPosts.length === 0 ? (
          <section className="text-center py-32" style={{ color: '#9ca3af' }}>
            <h2 className="text-2xl mb-2">Please wait...</h2>
          </section>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {displayedPosts.map((post) => (
              <PostCard key={post.id} post={post} basePath={basePath} useNST={true}/>
            ))}
            {hasMore && (
              <div className="text-center py-8" style={{ color: '#9ca3af' }}>
                {isLoadingMore ? (
                  <p>Loading more posts...</p>
                ) : (
                  <p>Scroll down to load more</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      
      <ScrollToTopButton onClick={handleScrollToTop} />
    </div>
  );
}
