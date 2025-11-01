'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PostCard from '../components/PostCard';
import ScrollToTopButton from '../components/ScrollToTopButton';

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

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function Gallery() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [displayedCount, setDisplayedCount] = useState(POSTS_PER_LOAD);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [postTimestamps, setPostTimestamps] = useState<Map<string, string>>(new Map());
  const [newPostsCount, setNewPostsCount] = useState(0); // Number of new posts available
  const [showNewPostsBubble, setShowNewPostsBubble] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const previousPostIdsRef = useRef<Set<string>>(new Set());
  const scrollCompensationRef = useRef<{ scrollY: number; scrollHeight: number } | null>(null);
  
  // Determine basePath based on whether we're in static export or server mode
  const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/latent-self') ? '/latent-self' : '';

  // Generate timestamp based on index - hours minimum, then days
  const generateTimestamp = (index: number): string => {
    const now = new Date();
    let millisecondsAgo: number;
    
    if (index === 0) {
      // First post: 2 hours ago (minimum hours)
      millisecondsAgo = 2 * 60 * 60 * 1000;
    } else if (index === 1) {
      // Second post: 6 hours ago
      millisecondsAgo = 6 * 60 * 60 * 1000;
    } else if (index === 2) {
      // Third post: 12 hours ago
      millisecondsAgo = 12 * 60 * 60 * 1000;
    } else if (index === 3) {
      // Fourth post: 18 hours ago
      millisecondsAgo = 18 * 60 * 60 * 1000;
    } else {
      // Posts after index 3: use days (index - 3 days ago)
      const daysAgo = index - 3;
      millisecondsAgo = daysAgo * 24 * 60 * 60 * 1000;
    }
    
    const timestamp = new Date(now.getTime() - millisecondsAgo);
    return timestamp.toISOString();
  };

  useEffect(() => {
    loadPosts(true); // Initial load
    
    // Auto-refresh every 30 seconds (without resetting displayed count unless new posts)
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
          fetchedData = await staticResponse.json() as Post[];
          console.log('Loaded posts from static file:', fetchedData);
        }
      } catch (e) {
        // Static file doesn't exist, try API
      }
      
      // Fallback to API (for server mode) if static didn't work
      if (fetchedData.length === 0) {
        const response = await fetch(`${basePath}/api/posts`);
        fetchedData = await response.json() as Post[];
        console.log('Loaded posts from API:', fetchedData);
      }
      
      let hasNewPosts = false;
      let newPostsCount = 0;
      let finalPostCount = fetchedData.length;
      
      setAllPosts((prevPosts) => {
        // If no existing posts, shuffle everything for initial load
        if (prevPosts.length === 0) {
          const shuffledData = shuffleArray(fetchedData);
          const timestampMap = new Map<string, string>();
          shuffledData.forEach((post, index) => {
            timestampMap.set(post.id, generateTimestamp(index));
          });
          setPostTimestamps(timestampMap);
          previousPostIdsRef.current = new Set(shuffledData.map(p => p.id));
          hasLoadedOnceRef.current = true;
          finalPostCount = shuffledData.length;
          return shuffledData;
        }
        
        // Find existing post IDs
        const existingPostIds = new Set(prevPosts.map(p => p.id));
        
        // Find new posts (posts not in existing set)
        const newPosts = fetchedData.filter(post => !existingPostIds.has(post.id));
        
        // If no new posts, keep existing order
        if (newPosts.length === 0) {
          finalPostCount = prevPosts.length;
          return prevPosts;
        }
        
        hasNewPosts = true;
        newPostsCount = newPosts.length;
        
        // Shuffle new posts and add them at the top
        const shuffledNewPosts = shuffleArray(newPosts);
        
        // Update timestamps: new posts get top positions, existing posts shift down
        setPostTimestamps((prevTimestamps) => {
          const newTimestampMap = new Map(prevTimestamps);
          
          // Assign timestamps to new posts at the top
          shuffledNewPosts.forEach((post, index) => {
            newTimestampMap.set(post.id, generateTimestamp(index));
          });
          
          // Shift existing posts' timestamps down by the number of new posts
          prevPosts.forEach((post, index) => {
            const oldTimestamp = prevTimestamps.get(post.id);
            if (oldTimestamp) {
              // Convert old timestamp to new index (index + number of new posts)
              newTimestampMap.set(post.id, generateTimestamp(shuffledNewPosts.length + index));
            }
          });
          
          return newTimestampMap;
        });
        
        // Update previous post IDs reference
        previousPostIdsRef.current = new Set(fetchedData.map(p => p.id));
        
        // Calculate final count: new posts + existing posts
        finalPostCount = shuffledNewPosts.length + prevPosts.length;
        
        // Return new posts at top, followed by existing posts in their original order
        return [...shuffledNewPosts, ...prevPosts];
      });
      
      // Only reset displayed count on initial load
      if (isInitialLoad) {
        setDisplayedCount(POSTS_PER_LOAD);
      } else if (hasNewPosts) {
        // When new posts appear, increase displayedCount by the number of new posts
        // This ensures the same posts the user was viewing remain visible
        // (they'll just shift down by the number of new posts added at top)
        setDisplayedCount(prev => {
          const newCount = prev + newPostsCount;
          return Math.min(newCount, finalPostCount);
        });
        
        // Show notification bubble when new posts are detected
        setNewPostsCount(newPostsCount);
        setShowNewPostsBubble(true);
        
        // Save scroll position before DOM update, will be restored in useEffect
        scrollCompensationRef.current = {
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight
        };
      } else {
        // No new posts, just ensure displayed count doesn't exceed available posts
        setDisplayedCount(prev => Math.min(prev, finalPostCount));
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
            {displayedPosts.map((post) => {
              const customTimestamp = postTimestamps.get(post.id);
              return (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  basePath={basePath} 
                  customTimestamp={customTimestamp}
                  useNST={true}
                />
              );
            })}
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
