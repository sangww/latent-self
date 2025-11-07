'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { formatTimestamp } from '../components/PostCard';

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

export default function GridPage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [displayedCount, setDisplayedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const [columns, setColumns] = useState(4);
  
  // Use refs to access latest values in scroll handler
  const displayedCountRef = useRef(displayedCount);
  const allPostsRef = useRef(allPosts);
  const isLoadingMoreRef = useRef(isLoadingMore);
  const columnsRef = useRef(columns);
  
  // Update refs when state changes
  useEffect(() => {
    displayedCountRef.current = displayedCount;
  }, [displayedCount]);
  
  useEffect(() => {
    allPostsRef.current = allPosts;
  }, [allPosts]);
  
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);
  
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);
  
  // Determine basePath based on whether we're in static export or server mode
  const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/latent-self') ? '/latent-self' : '';

  // Calculate initial load count based on columns (load enough to fill viewport + some)
  const getInitialLoadCount = useCallback(() => {
    if (typeof window === 'undefined') return columns * 4; // Default fallback
    // Load enough rows to fill viewport + 2 extra rows
    const rowsToLoad = Math.ceil((window.innerHeight / (window.innerWidth / columns)) + 2);
    return columns * rowsToLoad;
  }, [columns]);

  useEffect(() => {
    // Calculate columns first
    const calculateColumns = () => {
      if (typeof window === 'undefined') return;
      
      // Calculate how many columns fit based on window width
      // Each column should be at least 300px wide (adjust as needed)
      const minColumnWidth = 300;
      const windowWidth = window.innerWidth;
      const calculatedColumns = Math.max(2, Math.floor(windowWidth / minColumnWidth));
      setColumns(calculatedColumns);
    };

    calculateColumns();
    window.addEventListener('resize', calculateColumns);
    
    // Load posts after columns are calculated
    loadPosts();
    
    return () => window.removeEventListener('resize', calculateColumns);
  }, []);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      
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
      
      setAllPosts(fetchedData);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set initial displayed count after both posts and columns are ready
  useEffect(() => {
    if (allPosts.length > 0 && columns > 0) {
      const initialCount = getInitialLoadCount();
      if (displayedCount === 0) {
        setDisplayedCount(Math.min(initialCount, allPosts.length));
      }
    }
  }, [allPosts.length, columns, getInitialLoadCount, displayedCount]);

  const loadMorePosts = useCallback(() => {
    if (isLoadingMore || displayedCount >= allPosts.length) return;
    
    setIsLoadingMore(true);
    // Load more posts (enough for 2-3 more rows)
    const postsPerLoad = columns * 3;
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + postsPerLoad, allPosts.length));
      setIsLoadingMore(false);
    }, 300);
  }, [allPosts.length, displayedCount, isLoadingMore, columns]);

  // Scroll detection for loading more
  useEffect(() => {
    const handleScroll = () => {
      // Use refs to get latest values
      const currentDisplayedCount = displayedCountRef.current;
      const currentAllPosts = allPostsRef.current;
      const currentIsLoadingMore = isLoadingMoreRef.current;
      const currentColumns = columnsRef.current;
      
      // Check if we have posts and haven't displayed all
      if (currentAllPosts.length === 0) return;
      if (currentDisplayedCount >= currentAllPosts.length) return;
      if (currentIsLoadingMore) return;
      
      // Check if user is near the bottom (within 200px)
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Check if we're near the bottom
      const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
      
      if (distanceFromBottom <= 200) {
        console.log('Loading more posts...', { currentDisplayedCount, total: currentAllPosts.length, distanceFromBottom });
        // Load more posts directly
        setIsLoadingMore(true);
        const postsPerLoad = currentColumns * 3;
        setTimeout(() => {
          setDisplayedCount(prev => {
            const newCount = Math.min(prev + postsPerLoad, currentAllPosts.length);
            console.log('Loaded more posts', { prev, newCount, total: currentAllPosts.length });
            return newCount;
          });
          setIsLoadingMore(false);
        }, 300);
      }
    };

    // Add scroll listener with throttling
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    
    // Also check on mount in case content doesn't fill viewport
    setTimeout(handleScroll, 500);
    
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, []);


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
    <div 
      className="min-h-screen" 
      style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#000000', width: '100vw', height: '100vh', overflow: 'auto' }}
      onScroll={(e) => {
        // Also handle scroll on the container
        const target = e.currentTarget;
        const scrollTop = target.scrollTop;
        const scrollHeight = target.scrollHeight;
        const clientHeight = target.clientHeight;
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        
        if (distanceFromBottom <= 200) {
          const currentDisplayedCount = displayedCountRef.current;
          const currentAllPosts = allPostsRef.current;
          const currentIsLoadingMore = isLoadingMoreRef.current;
          const currentColumns = columnsRef.current;
          
          if (currentAllPosts.length > 0 && currentDisplayedCount < currentAllPosts.length && !currentIsLoadingMore) {
            console.log('Loading more posts from container scroll...', { currentDisplayedCount, total: currentAllPosts.length });
            setIsLoadingMore(true);
            const postsPerLoad = currentColumns * 3;
            setTimeout(() => {
              setDisplayedCount(prev => Math.min(prev + postsPerLoad, currentAllPosts.length));
              setIsLoadingMore(false);
            }, 300);
          }
        }
      }}
    >
      <main style={{ width: '100%', padding: 0, margin: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '1px',
            width: '100%',
            backgroundColor: '#000000',
          }}
        >
          {allPosts.slice(0, displayedCount).map((post) => (
            <div
              key={post.id}
              className="relative group"
              onMouseEnter={() => setHoveredPost(post.id)}
              onMouseLeave={() => setHoveredPost(null)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 0,
                overflow: 'hidden',
                backgroundColor: '#151318',
                cursor: 'pointer',
              }}
            >
              {/* Image */}
              <div className="relative w-full h-full">
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

              {/* Hover Overlay - Shows post content */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px',
                  opacity: hoveredPost === post.id ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  pointerEvents: hoveredPost === post.id ? 'auto' : 'none',
                  overflow: 'auto',
                }}
              >
                {/* Header */}
                <header style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 20%, #f093fb 40%, #4facfe 60%, #00f2fe 80%, #667eea 100%)',
                    backgroundSize: '200% 200%',
                    animation: 'gradient 3s ease infinite',
                    flexShrink: 0
                  }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}>sangularity</span>
                    <time style={{ color: '#9ca3af', fontSize: '12px' }}>{formatTimestamp(post.timestamp)}</time>
                  </div>
                </header>

                {/* Story */}
                {post.story && (
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#ffffff', 
                    lineHeight: '1.6',
                    marginBottom: '12px',
                    flex: 1,
                  }}>
                    <span style={{ fontWeight: 'bold', color: '#ffffff', marginRight: '8px' }}>sangularity</span>
                    {post.story}
                  </div>
                )}

                {/* Actions */}
                <footer style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  marginTop: 'auto',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <span style={{ color: '#ffffff', fontSize: '13px' }}>{post.likes}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span style={{ color: '#ffffff', fontSize: '13px' }}>{post.comments}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    <span style={{ color: '#ffffff', fontSize: '13px' }}>{post.shares}</span>
                  </div>
                </footer>
              </div>
            </div>
          ))}
        </div>

        {/* Loading more indicator */}
        {displayedCount < allPosts.length && (
          <div className="text-center py-8" style={{ color: '#9ca3af' }}>
            {isLoadingMore ? (
              <p>Loading more posts...</p>
            ) : (
              <p>Scroll down to load more</p>
            )}
          </div>
        )}

        {allPosts.length === 0 && !isLoading && (
          <section className="text-center py-32" style={{ color: '#9ca3af' }}>
            <h2 className="text-2xl mb-2">No posts found</h2>
          </section>
        )}
      </main>
    </div>
  );
}

