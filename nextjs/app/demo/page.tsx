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

export default function DemoGallery() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [postTimestamps, setPostTimestamps] = useState<Map<string, number>>(new Map());
  
  // Determine basePath based on whether we're in static export or server mode
  const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/latent-self') ? '/latent-self' : '';

  // Demo polling interval - 15 seconds for testing, change to 600000 for 10 minutes
  const POLL_INTERVAL = 60000; // 15 seconds for testing

  const addNextPost = useCallback(() => {
    if (allPosts.length === 0) return;

    setCurrentIndex((prev) => {
      const nextIndex = prev + 1;
      const reversedPosts = [...allPosts].reverse();
      
      // If we've displayed all posts, reset to show only the first one (newest)
      if (nextIndex >= allPosts.length) {
        const firstPost = reversedPosts[0];
        setDisplayedPosts([firstPost]);
        setPostTimestamps(new Map([[firstPost.id, Date.now()]]));
        return 1; // Next time, show from index 1
      }
      
      // Add next post at the TOP (beginning) of displayed posts
      // Since reversedPosts is newest first, we add reversedPosts[nextIndex]
      const newPost = reversedPosts[nextIndex];
      const now = Date.now();
      
      setPostTimestamps((prev) => {
        const newMap = new Map(prev);
        // Set new post timestamp
        newMap.set(newPost.id, now);
        return newMap;
      });
      
      setDisplayedPosts((prevPosts) => {
        // Add new post at the beginning (top)
        return [newPost, ...prevPosts];
      });
      
      return nextIndex;
    });
  }, [allPosts]);

  useEffect(() => {
    loadAllPosts();
  }, []);

  useEffect(() => {
    if (allPosts.length > 0) {
      // Reverse posts so newest is first
      const reversedPosts = [...allPosts].reverse();
      // Initialize with first post (newest)
      setDisplayedPosts([reversedPosts[0]]);
      setPostTimestamps(new Map([[reversedPosts[0].id, Date.now()]]));
      setCurrentIndex(0);
    }
  }, [allPosts]);

  // Update timestamps every minute for dynamic updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto-add posts every interval
    const interval = setInterval(() => {
      addNextPost();
      // Auto-scroll to top when new post is added
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [addNextPost]);

  const loadAllPosts = async () => {
    try {
      setIsLoading(true);
      
      // Try to load from static posts.json first (for static exports)
      try {
        const staticResponse = await fetch(`${basePath}/posts.json`);
        if (staticResponse.ok) {
          const data = await staticResponse.json();
          console.log('Loaded posts from static file:', data);
          setAllPosts(data);
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
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate fake recent timestamp
  const generateFakeTimestamp = (minutesAgo: number) => {
    const now = new Date();
    const timestamp = new Date(now.getTime() - minutesAgo * 60000);
    return timestamp.toISOString();
  };

  if (isLoading) {
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
            {displayedPosts.map((post, index) => {
              // Use stored timestamp or generate based on index
              // tick variable forces re-render to update timestamps dynamically
              const _ = tick;
              const storedTimestamp = postTimestamps.get(post.id);
              const fakeTimestamp = storedTimestamp 
                ? new Date(storedTimestamp).toISOString() 
                : generateFakeTimestamp(displayedPosts.length - index - 1);
              
              return (
                <PostCard 
                  key={`${post.id}-${index}`} 
                  post={post} 
                  basePath={basePath}
                  customTimestamp={fakeTimestamp}
                />
              );
            })}
          </div>
        )}
      </main>
      
      <ScrollToTopButton onClick={handleScrollToTop} />
    </div>
  );
}

