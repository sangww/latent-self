'use client';

import { useEffect, useState, useCallback } from 'react';
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
    loadPosts();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPosts, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      
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
      
      setAllPosts((prevPosts) => {
        // If no existing posts, shuffle everything for initial load
        if (prevPosts.length === 0) {
          const shuffledData = shuffleArray(fetchedData);
          const timestampMap = new Map<string, string>();
          shuffledData.forEach((post, index) => {
            timestampMap.set(post.id, generateTimestamp(index));
          });
          setPostTimestamps(timestampMap);
          return shuffledData;
        }
        
        // Find existing post IDs
        const existingPostIds = new Set(prevPosts.map(p => p.id));
        
        // Find new posts (posts not in existing set)
        const newPosts = fetchedData.filter(post => !existingPostIds.has(post.id));
        
        // If no new posts, keep existing order
        if (newPosts.length === 0) {
          return prevPosts;
        }
        
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
        
        // Return new posts at top, followed by existing posts in their original order
        return [...shuffledNewPosts, ...prevPosts];
      });
      
      // Reset displayed count to show new posts at top
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
      
      <ScrollToTopButton onClick={handleScrollToTop} />
    </div>
  );
}
