'use client';

import { useEffect, useState, useRef } from 'react';
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

export default function GridPage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const [displayedPost, setDisplayedPost] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHoveredPostRef = useRef<string | null>(null);
  
  // Determine basePath based on whether we're in static export or server mode
  const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/latent-self') ? '/latent-self' : '';

  useEffect(() => {
    loadPosts();
  }, []);

  // Prevent body scrolling on mobile
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, []);

  // Handle mouse events globally when dragging (in case user drags outside container)
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || allPosts.length === 0) return;
      
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const mouseY = e.clientY - containerRect.top;
      const containerHeight = containerRect.height;
      
      // Calculate which post is being hovered based on visible strip position
      const postHeight = containerHeight / allPosts.length;
      const hoveredIndex = Math.floor(mouseY / postHeight);
      
      if (hoveredIndex >= 0 && hoveredIndex < allPosts.length) {
        const post = allPosts[hoveredIndex];
        const postTop = hoveredIndex * postHeight;
        const postBottom = postTop + postHeight;
        
        if (mouseY >= postTop && mouseY <= postBottom) {
          const newPostId = post.id;
          setHoveredPost(newPostId);
          setDisplayedPost(newPostId);
          lastHoveredPostRef.current = newPostId;
        }
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      if (lastHoveredPostRef.current) {
        setDisplayedPost(lastHoveredPostRef.current);
      }
      setHoveredPost(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, allPosts]);

  // Handle touch events globally when touching (in case user drags outside container)
  useEffect(() => {
    if (!isTouching) return;

    const handleGlobalTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      if (!containerRef.current || allPosts.length === 0 || !e.touches[0]) return;
      
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const touch = e.touches[0];
      const touchY = touch.clientY - containerRect.top;
      const containerHeight = containerRect.height;
      
      // Calculate which post is being touched based on visible strip position
      const postHeight = containerHeight / allPosts.length;
      const touchedIndex = Math.floor(touchY / postHeight);
      const validIndex = Math.max(0, Math.min(touchedIndex, allPosts.length - 1));
      const post = allPosts[validIndex];
      
      if (post) {
        const newPostId = post.id;
        setHoveredPost(newPostId);
        setDisplayedPost(newPostId);
        lastHoveredPostRef.current = newPostId;
      }
    };

    const handleGlobalTouchEnd = () => {
      setIsTouching(false);
      if (lastHoveredPostRef.current) {
        setDisplayedPost(lastHoveredPostRef.current);
      }
      setHoveredPost(null);
    };

    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalTouchEnd);
    
    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isTouching, allPosts]);

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
      
      // Randomize default image on load
      if (fetchedData.length > 0) {
        const randomIndex = Math.floor(Math.random() * fetchedData.length);
        const randomPostId = fetchedData[randomIndex].id;
        setDisplayedPost(randomPostId);
        lastHoveredPostRef.current = randomPostId; // Initialize ref with random post
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent default behavior (text selection, context menu)
    e.preventDefault();
    setIsDragging(true);
    
    if (!containerRef.current || allPosts.length === 0) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const mouseY = e.clientY - containerRect.top;
    const containerHeight = containerRect.height;
    
    // Calculate which post is being clicked based on visible strip position
    const postHeight = containerHeight / allPosts.length;
    const clickedIndex = Math.floor(mouseY / postHeight);
    
    if (clickedIndex >= 0 && clickedIndex < allPosts.length) {
      const post = allPosts[clickedIndex];
      const newPostId = post.id;
      setHoveredPost(newPostId);
      setDisplayedPost(newPostId);
      lastHoveredPostRef.current = newPostId;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only update if dragging (mouse is down)
    if (!isDragging || !containerRef.current || allPosts.length === 0) return;
    
    // Prevent default behavior during drag
    e.preventDefault();
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const mouseY = e.clientY - containerRect.top;
    const containerHeight = containerRect.height;
    
    // Calculate which post is being hovered based on visible strip position
    const postHeight = containerHeight / allPosts.length;
    const hoveredIndex = Math.floor(mouseY / postHeight);
    
    if (hoveredIndex >= 0 && hoveredIndex < allPosts.length) {
      const post = allPosts[hoveredIndex];
      // Only set hover if mouse is actually over a visible part of the strip
      const postTop = hoveredIndex * postHeight;
      const postBottom = postTop + postHeight;
      
      if (mouseY >= postTop && mouseY <= postBottom) {
        const newPostId = post.id;
        setHoveredPost(newPostId);
        setDisplayedPost(newPostId); // Always update displayed post when dragging
        lastHoveredPostRef.current = newPostId; // Track the last hovered post
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Keep the last hovered post as displayed when mouse is released
    if (lastHoveredPostRef.current) {
      setDisplayedPost(lastHoveredPostRef.current);
    }
    setHoveredPost(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    // Keep the last hovered post as displayed when mouse leaves
    // Use the ref to ensure we have the most recent hovered post
    if (lastHoveredPostRef.current) {
      setDisplayedPost(lastHoveredPostRef.current);
    }
    setHoveredPost(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Prevent default scrolling behavior on touch start
    e.preventDefault();
    setIsTouching(true);
    
    if (!containerRef.current || allPosts.length === 0 || !e.touches[0]) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const touch = e.touches[0];
    const touchY = touch.clientY - containerRect.top;
    const containerHeight = containerRect.height;
    
    // Calculate which post is being touched based on visible strip position
    const postHeight = containerHeight / allPosts.length;
    const touchedIndex = Math.floor(touchY / postHeight);
    const validIndex = Math.max(0, Math.min(touchedIndex, allPosts.length - 1));
    const post = allPosts[validIndex];
    
    if (post) {
      const newPostId = post.id;
      setHoveredPost(newPostId);
      setDisplayedPost(newPostId);
      lastHoveredPostRef.current = newPostId;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // Prevent default scrolling behavior
    e.preventDefault();
    
    if (!containerRef.current || allPosts.length === 0 || !e.touches[0]) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const touch = e.touches[0];
    const touchY = touch.clientY - containerRect.top;
    const containerHeight = containerRect.height;
    
    // Calculate which post is being touched based on visible strip position
    const postHeight = containerHeight / allPosts.length;
    const touchedIndex = Math.floor(touchY / postHeight);
    
    // Clamp index to valid range
    const validIndex = Math.max(0, Math.min(touchedIndex, allPosts.length - 1));
    const post = allPosts[validIndex];
    
    if (post) {
      const newPostId = post.id;
      // Always update on touch move - no need for extra bounds checking
      setHoveredPost(newPostId);
      setDisplayedPost(newPostId);
      lastHoveredPostRef.current = newPostId;
    }
  };

  const handleTouchEnd = () => {
    setIsTouching(false);
    // Keep the last touched post as displayed when touch ends
    if (lastHoveredPostRef.current) {
      setDisplayedPost(lastHoveredPostRef.current);
    }
    setHoveredPost(null);
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
    <div 
      className="min-h-screen" 
      style={{ 
        fontFamily: 'Arial, sans-serif', 
        backgroundColor: '#000000', 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
        touchAction: 'none', // Prevent page scrolling on mobile
        position: 'fixed', // Prevent page scroll
        top: 0,
        left: 0,
      }}
    >
      <main 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
        style={{ 
          width: '100%', 
          height: '100%', 
          padding: 0, 
          margin: 0,
          position: 'relative',
          overflow: 'hidden',
          touchAction: 'none', // Prevent default touch behaviors (scrolling, zooming)
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS (though we're preventing it)
          userSelect: 'none', // Prevent text selection
          WebkitUserSelect: 'none', // Prevent text selection on Safari
          cursor: 'grab', // Show grab cursor
        }}
      >
        {/* Single container - only render ONE image at a time (currently hovered or last displayed) */}
        {(() => {
          const post = displayedPost 
            ? allPosts.find(p => p.id === displayedPost)
            : null;
          
          if (!post) return null;
          
          const isHovered = hoveredPost === post.id;
          
          return (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                transition: 'transform 0.3s ease, filter 0.3s ease',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
            >
              {/* Image */}
              <div className="relative w-full h-full">
                <Image
                  key={post.id}
                  src={`${basePath}/db/${post.filename}`}
                  alt={`AI Generated Art - ${post.type}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority
                  unoptimized
                  style={{ 
                    filter: isHovered
                      ? 'contrast(0.9) saturate(1.1) brightness(1.15) hue-rotate(0deg)'
                      : 'contrast(0.75) saturate(0.9) brightness(1.08) hue-rotate(-4deg)',
                    transition: 'filter 0.3s ease'
                  }}
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
                  pointerEvents: 'none',
                  opacity: isHovered ? 0.5 : 1,
                  transition: 'opacity 0.3s ease'
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
                  pointerEvents: 'none',
                  opacity: isHovered ? 0.5 : 1,
                  transition: 'opacity 0.3s ease'
                }}></div>
                {/* Vignette effect */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.6) 100%)',
                  pointerEvents: 'none',
                  opacity: isHovered ? 0.3 : 1,
                  transition: 'opacity 0.3s ease'
                }}></div>
              </div>
            </div>
          );
        })()}

        {allPosts.length === 0 && (
          <section className="text-center py-32" style={{ color: '#9ca3af' }}>
            <h2 className="text-2xl mb-2">No posts found</h2>
          </section>
        )}
      </main>
    </div>
  );
}

