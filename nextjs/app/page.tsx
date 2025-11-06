'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PostCard from './components/PostCard';
import ScrollToTopButton from './components/ScrollToTopButton';

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

const POSTS_PER_LOAD = 5;

export default function Gallery() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [displayedCount, setDisplayedCount] = useState(POSTS_PER_LOAD);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0); // Number of new posts available
  const [showNewPostsBubble, setShowNewPostsBubble] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const previousPostIdsRef = useRef<Set<string>>(new Set());
  const scrollCompensationRef = useRef<{ scrollY: number; scrollHeight: number } | null>(null);
  
  // Determine basePath based on whether we're in static export or server mode
  const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/latent-self') ? '/latent-self' : '';

  useEffect(() => {
    loadPosts(true); // Initial load
    
    // Auto-refresh every 30 seconds (without resetting displayed count)
    const interval = setInterval(() => loadPosts(false), 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadPosts = async (isInitialLoad: boolean = false) => {
    const shouldShowLoading = isInitialLoad || !hasLoadedOnceRef.current;
    
    try {
      // Only set loading state on initial load to avoid flicker during auto-refresh
      if (shouldShowLoading) {
        setIsLoading(true);
      }
      
      let fetchedData: Post[] = [];
      
      // Try to load from static posts.json first (for static exports)
      try {
        const staticResponse = await fetch(`${basePath}/posts.json`);
        if (staticResponse.ok) {
          fetchedData = await staticResponse.json();
          console.log('Loaded posts from static file:', fetchedData);
        }
      } catch (e) {
        // Static file doesn't exist, try API
      }
      
      // Fallback to API (for server mode)
      if (fetchedData.length === 0) {
        const response = await fetch(`${basePath}/api/posts`);
        fetchedData = await response.json();
        console.log('Loaded posts from API:', fetchedData);
      }
      
      // Detect new posts by comparing with previous post IDs
      let hasNewPosts = false;
      let newPostsCount = 0;
      
      if (!isInitialLoad && previousPostIdsRef.current.size > 0) {
        const currentPostIds = new Set(fetchedData.map(p => p.id));
        const previousIds = previousPostIdsRef.current;
        
        // Find new posts (IDs in current that weren't in previous)
        fetchedData.forEach(post => {
          if (!previousIds.has(post.id)) {
            hasNewPosts = true;
            newPostsCount++;
          }
        });
      }
      
      setAllPosts(fetchedData);
      
      // Only reset displayed count on initial load
      if (isInitialLoad) {
        setDisplayedCount(POSTS_PER_LOAD);
        // Initialize previous post IDs reference on initial load
        previousPostIdsRef.current = new Set(fetchedData.map(p => p.id));
      } else {
        // Ensure displayed count doesn't exceed available posts after refresh
        setDisplayedCount(prev => Math.min(prev, fetchedData.length));
        
        // Show notification bubble if new posts are detected
        if (hasNewPosts) {
          setNewPostsCount(newPostsCount);
          setShowNewPostsBubble(true);
          
          // Save scroll position before DOM update, will be restored in useEffect
          scrollCompensationRef.current = {
            scrollY: window.scrollY,
            scrollHeight: document.documentElement.scrollHeight
          };
        }
        
        // Update previous post IDs reference after checking for new posts
        previousPostIdsRef.current = new Set(fetchedData.map(p => p.id));
      }
      
      hasLoadedOnceRef.current = true;
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      // Only clear loading state if it was set
      if (shouldShowLoading) {
        setIsLoading(false);
      }
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

  // Compensate scroll position when new posts are added at the top
  useEffect(() => {
    if (scrollCompensationRef.current) {
      const { scrollY, scrollHeight } = scrollCompensationRef.current;
      
      // Wait for DOM to update, then adjust scroll position
      requestAnimationFrame(() => {
        const newScrollHeight = document.documentElement.scrollHeight;
        const heightDiff = newScrollHeight - scrollHeight;
        
        if (heightDiff > 0) {
          // Adjust scroll position to maintain visual position
          window.scrollTo({
            top: scrollY + heightDiff,
            behavior: 'instant' as ScrollBehavior
          });
        }
        
        // Clear the compensation ref
        scrollCompensationRef.current = null;
      });
    }
  }, [allPosts, displayedCount]);

  useEffect(() => {
    const handleScroll = () => {
      // Check if user is near the bottom (within 200px)
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      if (scrollTop + windowHeight >= documentHeight - 200) {
        loadMorePosts();
      }
      
      // Hide new posts bubble if user scrolls to top (within 10px from top)
      // This ensures bubble disappears when user manually scrolls to view new posts
      if (scrollTop <= 10 && showNewPostsBubble) {
        setShowNewPostsBubble(false);
        setNewPostsCount(0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMorePosts, showNewPostsBubble]);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadPosts(true); // Reset when manually refreshing from top
    setShowNewPostsBubble(false);
    setNewPostsCount(0);
  };

  const handleShowNewPosts = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowNewPostsBubble(false);
    setNewPostsCount(0);
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
      
      {/* New Posts Notification Bubble */}
      {showNewPostsBubble && newPostsCount > 0 && (
        <button
          onClick={handleShowNewPosts}
          style={{
            position: 'fixed',
            top: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: '24px',
            backgroundColor: '#1e1b22',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontSize: '14px',
            fontWeight: '500',
            fontFamily: 'Arial, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#25202f';
            e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1e1b22';
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>{'new post'}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      )}
      
      <ScrollToTopButton onClick={handleScrollToTop} />
    </div>
  );
}
