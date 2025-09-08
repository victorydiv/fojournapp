const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

const router = express.Router();

// Configure multer for hero image uploads
const heroStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/blog-images');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'blog-hero-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer for content image uploads
const contentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/blog-images');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'blog-content-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: heroStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const contentUpload = multer({
  storage: contentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

// Helper function to estimate reading time
function estimateReadingTime(content) {
  const wordsPerMinute = 200;
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Helper function to extract excerpt from content
function generateExcerpt(content, length = 160) {
  const textContent = content.replace(/<[^>]*>/g, '');
  return textContent.length > length ? textContent.substring(0, length) + '...' : textContent;
}

// Get all published blog posts (public endpoint)
router.get('/public', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      featured, 
      search 
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    // Build dynamic query with search and filter parameters
    let whereClause = 'WHERE bp.status = "published"';
    let queryParams = [];
    
    // Add search functionality
    if (search) {
      whereClause += ' AND (bp.title LIKE ? OR bp.excerpt LIKE ? OR bp.content LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Add category filter (if implemented)
    if (category) {
      // Note: Category filtering would need to be implemented with proper table joins
      // For now, we'll skip this until category functionality is fully implemented
    }
    
    // Add featured filter
    if (featured === 'true') {
      whereClause += ' AND bp.featured = 1';
    }
    
    const query = `
      SELECT 
        bp.id,
        bp.title,
        bp.slug,
        bp.excerpt,
        bp.hero_image_url,
        bp.published_at,
        bp.reading_time,
        bp.view_count,
        bp.featured,
        u.username as author_name,
        u.first_name,
        u.last_name,
        u.avatar_path as author_avatar
      FROM blog_posts bp
      JOIN users u ON bp.author_id = u.id
      ${whereClause}
      ORDER BY bp.featured DESC, bp.published_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    const [posts] = await pool.execute(query, queryParams);
    
    // Get total count with same filters
    const countQuery = `
      SELECT COUNT(*) as total
      FROM blog_posts bp
      ${whereClause}
    `;
    const [countResult] = await pool.execute(countQuery, queryParams);
    const total = countResult[0].total;
    
    // Process posts
    const processedPosts = posts.map(post => ({
      ...post,
      // Convert relative URLs to absolute URLs for public access
      hero_image_url: post.hero_image_url 
        ? (post.hero_image_url.startsWith('/') 
            ? `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}${post.hero_image_url}` 
            : post.hero_image_url)
        : null,
      // Process author avatar URL
      author_avatar: post.author_avatar 
        ? (post.author_avatar.startsWith('/') 
            ? `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}${post.author_avatar}` 
            : post.author_avatar)
        : null,
      author_display_name: post.first_name && post.last_name 
        ? `${post.first_name} ${post.last_name}` 
        : post.author_name,
      categories: [],
      category_slugs: [],
      category_colors: []
    }));
    
    // Debug: Log the processed posts to see hero_image_url values
    console.log('Processed posts:', processedPosts.map(p => ({ 
      id: p.id, 
      title: p.title, 
      hero_image_url: p.hero_image_url 
    })));
    
    res.json({
      posts: processedPosts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: (page * limit) < total,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// Get single blog post by slug (public endpoint)
router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get post with full details
    const [posts] = await pool.execute(`
      SELECT 
        bp.*,
        u.username as author_name,
        u.first_name,
        u.last_name,
        u.avatar_path as author_avatar,
        GROUP_CONCAT(c.name) as categories,
        GROUP_CONCAT(c.slug) as category_slugs,
        GROUP_CONCAT(c.color) as category_colors
      FROM blog_posts bp
      JOIN users u ON bp.author_id = u.id
      LEFT JOIN blog_post_categories bpc ON bp.id = bpc.blog_post_id
      LEFT JOIN blog_categories c ON bpc.category_id = c.id
      WHERE bp.slug = ? AND bp.status = "published"
      GROUP BY bp.id
    `, [slug]);
    
    if (!posts.length) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    const post = posts[0];
    
    // Track view (simple IP-based tracking)
    const clientIP = req.ip || req.connection.remoteAddress;
    await pool.execute(`
      INSERT INTO blog_post_views (blog_post_id, ip_address, user_agent, referer)
      VALUES (?, ?, ?, ?)
    `, [post.id, clientIP, req.get('User-Agent') || '', req.get('Referer') || '']);
    
    // Increment view count
    await pool.execute(`
      UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ?
    `, [post.id]);
    
    // Get related posts (same category, different post)
    const [relatedPosts] = await pool.execute(`
      SELECT DISTINCT
        bp.id,
        bp.title,
        bp.slug,
        bp.excerpt,
        bp.hero_image_url,
        bp.published_at,
        bp.reading_time
      FROM blog_posts bp
      JOIN blog_post_categories bpc ON bp.id = bpc.blog_post_id
      JOIN blog_post_categories bpc2 ON bpc.category_id = bpc2.category_id
      WHERE bpc2.blog_post_id = ? 
        AND bp.id != ? 
        AND bp.status = "published"
      ORDER BY bp.published_at DESC
      LIMIT 3
    `, [post.id, post.id]);
    
    // Process post data
    const processedPost = {
      ...post,
      // Convert relative URLs to absolute URLs for public access
      hero_image_url: post.hero_image_url 
        ? (post.hero_image_url.startsWith('/') 
            ? `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}${post.hero_image_url}` 
            : post.hero_image_url)
        : null,
      // Process author avatar URL
      author_avatar: post.author_avatar 
        ? (post.author_avatar.startsWith('/') 
            ? `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}${post.author_avatar}` 
            : post.author_avatar)
        : null,
      author_display_name: post.first_name && post.last_name 
        ? `${post.first_name} ${post.last_name}` 
        : post.author_name,
      categories: post.categories ? post.categories.split(',') : [],
      category_slugs: post.category_slugs ? post.category_slugs.split(',') : [],
      category_colors: post.category_colors ? post.category_colors.split(',') : [],
      // Parse tags JSON string into array with error handling
      tags: (() => {
        const originalTags = post.tags;
        if (!originalTags) return [];
        
        // If it's already an array, return it as-is
        if (Array.isArray(originalTags)) return originalTags;
        
        // If it's a string, try to parse it
        if (typeof originalTags === 'string') {
          try {
            return JSON.parse(originalTags);
          } catch (e) {
            // If JSON parsing fails, treat as comma-separated string
            console.warn(`Invalid JSON in tags for post ${post.id}: ${originalTags}`);
            return originalTags.split(',').map(tag => tag.trim()).filter(tag => tag);
          }
        }
        
        // Default fallback
        return [];
      })(),
      related_posts: relatedPosts.map(rp => ({
        ...rp,
        // Fix related post image URLs too
        hero_image_url: rp.hero_image_url 
          ? (rp.hero_image_url.startsWith('/') 
              ? `${process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fojourn.site' : 'http://localhost:3001')}${rp.hero_image_url}` 
              : rp.hero_image_url)
          : null
      }))
    };
    
    res.json({ post: processedPost });
    
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// Get blog categories (public endpoint)
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute(`
      SELECT 
        c.*,
        COUNT(bp.id) as post_count
      FROM blog_categories c
      LEFT JOIN blog_post_categories bpc ON c.id = bpc.category_id
      LEFT JOIN blog_posts bp ON bpc.blog_post_id = bp.id AND bp.status = "published"
      GROUP BY c.id
      ORDER BY c.name
    `);
    
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    res.status(500).json({ error: 'Failed to fetch blog categories' });
  }
});

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!users.length || !users[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Admin: Get all blog posts
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Admin blog posts request received:', req.query);
    console.log('User ID:', req.userId, 'User role:', req.userRole);
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search 
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let whereClause = '';
    let queryParams = [];
    
    if (status) {
      whereClause += 'WHERE bp.status = ?';
      queryParams.push(status);
    }
    
    if (search) {
      whereClause += (whereClause ? ' AND' : 'WHERE') + ' (bp.title LIKE ? OR bp.excerpt LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }
    
    // Ensure parameters are integers and properly formatted
    const finalQueryParams = [...queryParams];
    
    const query = `
      SELECT 
        bp.id,
        bp.title,
        bp.slug,
        bp.excerpt,
        bp.content,
        bp.hero_image_url,
        bp.hero_image_filename,
        bp.author_id,
        bp.status,
        bp.featured,
        bp.published_at,
        bp.seo_title,
        bp.seo_description,
        bp.tags,
        bp.reading_time,
        bp.view_count,
        bp.created_at,
        bp.updated_at,
        u.username as author_name,
        u.first_name,
        u.last_name
      FROM blog_posts bp
      JOIN users u ON bp.author_id = u.id
      ${whereClause}
      ORDER BY bp.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    console.log('Executing query with params:', finalQueryParams);
    console.log('Query:', query);
    const [posts] = await pool.execute(query, finalQueryParams);
    
    // Fetch categories for each post
    const postsWithCategories = await Promise.all(posts.map(async (post) => {
      const [categories] = await pool.execute(`
        SELECT c.name, c.slug, c.color
        FROM blog_categories c
        JOIN blog_post_categories bpc ON c.id = bpc.category_id
        WHERE bpc.blog_post_id = ?
      `, [post.id]);
      
      return {
        ...post,
        categories: categories.map(cat => cat.name)
      };
    }));
    
    // Get total count
    const countQuery = whereClause 
      ? `SELECT COUNT(*) as total FROM blog_posts bp ${whereClause}`
      : `SELECT COUNT(*) as total FROM blog_posts bp`;
    
    const [countResult] = queryParams.length > 0 
      ? await pool.execute(countQuery, queryParams)
      : await pool.execute(countQuery);

    res.json({
      posts: postsWithCategories.map(post => ({
        ...post,
        featured: Boolean(post.featured), // Convert 0/1 to true/false
        author_display_name: post.first_name && post.last_name 
          ? `${post.first_name} ${post.last_name}` 
          : post.author_name
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// Admin: Get individual blog post for editing
router.get('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const [posts] = await pool.execute(`
      SELECT 
        bp.*,
        u.username as author_name,
        u.first_name,
        u.last_name
      FROM blog_posts bp
      JOIN users u ON bp.author_id = u.id
      WHERE bp.id = ?
    `, [postId]);
    
    if (!posts.length) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    const post = posts[0];

    // Get categories for this post
    const [categories] = await pool.execute(`
      SELECT c.id, c.name, c.slug, c.color
      FROM blog_categories c
      JOIN blog_post_categories bpc ON c.id = bpc.category_id
      WHERE bpc.blog_post_id = ?
    `, [postId]);

    // Process the post data
    const originalTags = post.tags;
    const processedPost = {
      ...post,
      featured: Boolean(post.featured),
      tags: (() => {
        if (!originalTags) return [];
        
        // If it's already an array, return it as-is
        if (Array.isArray(originalTags)) return originalTags;
        
        // If it's a string, try to parse it
        if (typeof originalTags === 'string') {
          try {
            return JSON.parse(originalTags);
          } catch (e) {
            // If JSON parsing fails, treat as comma-separated string
            console.warn(`Invalid JSON in tags for post ${post.id}: ${originalTags}`);
            return originalTags.split(',').map(tag => tag.trim()).filter(tag => tag);
          }
        }
        
        // Default fallback
        return [];
      })(),
      categories: categories.map(cat => cat.name),
      category_ids: categories.map(cat => cat.id),
      author_display_name: post.first_name && post.last_name 
        ? `${post.first_name} ${post.last_name}` 
        : post.author_name
    };

    res.json({ post: processedPost });
    
  } catch (error) {
    console.error('Error fetching blog post for edit:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// Admin: Create blog post
router.post('/admin', authenticateToken, requireAdmin, upload.single('hero_image'), async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      status = 'draft',
      featured: featuredRaw = 'false',
      seo_title,
      seo_description,
      tags,
      categories
    } = req.body;
    
    // Convert string boolean to actual boolean
    const featured = featuredRaw === 'true' || featuredRaw === true;
    
    // Parse categories array if it's a JSON string
    let parsedCategories = [];
    if (categories) {
      try {
        parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
      } catch (e) {
        console.error('Error parsing categories:', e);
        parsedCategories = [];
      }
    }
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Generate slug
    let slug = generateSlug(title);
    
    // Ensure slug is unique
    let slugCounter = 1;
    let finalSlug = slug;
    while (true) {
      const [existing] = await pool.execute('SELECT id FROM blog_posts WHERE slug = ?', [finalSlug]);
      if (!existing.length) break;
      finalSlug = `${slug}-${slugCounter}`;
      slugCounter++;
    }
    
    // Process hero image if uploaded
    let heroImageUrl = null;
    let heroImageFilename = null;
    
    if (req.file) {
      heroImageFilename = req.file.filename;
      
      // Create optimized version
      const optimizedPath = path.join(path.dirname(req.file.path), 'optimized-' + req.file.filename);
      await sharp(req.file.path)
        .resize(1200, 630, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 85 })
        .toFile(optimizedPath);
      
      heroImageUrl = `/api/blog/image/optimized-${heroImageFilename}`;
    }
    
    // Calculate reading time and generate excerpt if not provided
    const readingTime = estimateReadingTime(content);
    const finalExcerpt = excerpt || generateExcerpt(content);
    
    // Ensure SEO fields don't exceed database limits
    const finalSeoTitle = seo_title ? seo_title.substring(0, 100) : null;
    const finalSeoDescription = seo_description ? seo_description.substring(0, 160) : null;
    
    // Create blog post
    const publishedAt = status === 'published' ? new Date() : null;
    
    const [result] = await pool.execute(`
      INSERT INTO blog_posts (
        title, slug, excerpt, content, hero_image_url, hero_image_filename,
        author_id, status, featured, published_at, seo_title, seo_description,
        tags, reading_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title, finalSlug, finalExcerpt, content, heroImageUrl, heroImageFilename,
      req.user.id, status, featured, publishedAt, finalSeoTitle, finalSeoDescription,
      tags ? JSON.stringify(tags) : null, readingTime
    ]);
    
    const postId = result.insertId;
    
    // Add categories
    if (parsedCategories && parsedCategories.length > 0) {
      for (const categoryId of parsedCategories) {
        await pool.execute(
          'INSERT INTO blog_post_categories (blog_post_id, category_id) VALUES (?, ?)',
          [postId, categoryId]
        );
      }
    }
    
    // Submit to Google Search Console if published
    if (status === 'published') {
      // TODO: Implement Google Search Console submission
      console.log(`📝 Blog post published: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/blog/${finalSlug}`);
    }
    
    res.status(201).json({
      message: 'Blog post created successfully',
      post: {
        id: postId,
        slug: finalSlug,
        status,
        published_at: publishedAt
      }
    });
    
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// Admin: Update blog post
router.put('/admin/:id', authenticateToken, requireAdmin, upload.single('hero_image'), async (req, res) => {
  try {
    console.log('PUT /admin/:id request received');
    console.log('Request body:', req.body);
    console.log('Request params:', req.params);
    console.log('Request file:', req.file ? 'File present' : 'No file');
    
    const { id } = req.params;
    const {
      title,
      content,
      excerpt,
      status,
      featured,
      seo_title,
      seo_description,
      tags,
      categories
    } = req.body;

    // Parse FormData strings back to arrays/objects
    let parsedCategories = [];
    if (categories) {
      try {
        parsedCategories = JSON.parse(categories);
      } catch (error) {
        console.warn('Failed to parse categories:', error);
        parsedCategories = [];
      }
    }

    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch (error) {
        console.warn('Failed to parse tags:', error);
        parsedTags = [];
      }
    }

    console.log('Parsed categories:', parsedCategories);
    console.log('Parsed tags:', parsedTags);
    
    // Get existing post
    const [existingPosts] = await pool.execute('SELECT * FROM blog_posts WHERE id = ?', [id]);
    if (!existingPosts.length) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    const existingPost = existingPosts[0];
    let updateData = { ...existingPost };
    
    if (title) {
      updateData.title = title;
      // Regenerate slug if title changed
      if (title !== existingPost.title) {
        updateData.slug = generateSlug(title);
      }
    }
    
    if (content) {
      updateData.content = content;
      updateData.reading_time = estimateReadingTime(content);
      if (!excerpt) {
        updateData.excerpt = generateExcerpt(content);
      }
    }
    
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (status !== undefined) updateData.status = status;
    if (featured !== undefined) updateData.featured = featured === 'true' || featured === true ? 1 : 0;
    if (seo_title !== undefined) updateData.seo_title = seo_title;
    if (seo_description !== undefined) updateData.seo_description = seo_description;
    if (parsedTags !== undefined) updateData.tags = parsedTags.length > 0 ? JSON.stringify(parsedTags) : null;
    
    // Handle published_at
    if (status === 'published' && existingPost.status !== 'published') {
      updateData.published_at = new Date();
    }
    
    // Handle hero image update
    if (req.file) {
      updateData.hero_image_filename = req.file.filename;
      
      // Create optimized version
      const optimizedPath = path.join(path.dirname(req.file.path), 'optimized-' + req.file.filename);
      await sharp(req.file.path)
        .resize(1200, 630, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 85 })
        .toFile(optimizedPath);
      
      updateData.hero_image_url = `/api/blog/image/optimized-${req.file.filename}`;
      
      // Clean up old image
      if (existingPost.hero_image_filename) {
        try {
          await fs.unlink(path.join(__dirname, '../uploads/blog-images', existingPost.hero_image_filename));
          await fs.unlink(path.join(__dirname, '../uploads/blog-images', 'optimized-' + existingPost.hero_image_filename));
        } catch (error) {
          console.warn('Failed to delete old hero image:', error);
        }
      }
    }
    
    // Update blog post
    await pool.execute(`
      UPDATE blog_posts SET
        title = ?, slug = ?, excerpt = ?, content = ?, hero_image_url = ?, 
        hero_image_filename = ?, status = ?, featured = ?, published_at = ?,
        seo_title = ?, seo_description = ?, tags = ?, reading_time = ?
      WHERE id = ?
    `, [
      updateData.title, updateData.slug, updateData.excerpt, updateData.content,
      updateData.hero_image_url, updateData.hero_image_filename, updateData.status,
      updateData.featured, updateData.published_at, updateData.seo_title,
      updateData.seo_description, updateData.tags, updateData.reading_time, id
    ]);
    
    // Update categories
    if (parsedCategories !== undefined) {
      // Remove existing categories
      await pool.execute('DELETE FROM blog_post_categories WHERE blog_post_id = ?', [id]);
      
      // Add new categories
      if (parsedCategories.length > 0) {
        for (const categoryId of parsedCategories) {
          await pool.execute(
            'INSERT INTO blog_post_categories (blog_post_id, category_id) VALUES (?, ?)',
            [id, categoryId]
          );
        }
      }
    }
    
    res.json({ message: 'Blog post updated successfully' });
    
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

// Admin: Delete blog post
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get post info for cleanup
    const [posts] = await pool.execute('SELECT hero_image_filename FROM blog_posts WHERE id = ?', [id]);
    if (!posts.length) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    const post = posts[0];
    
    // Delete blog post (cascade will handle categories and views)
    await pool.execute('DELETE FROM blog_posts WHERE id = ?', [id]);
    
    // Clean up hero image
    if (post.hero_image_filename) {
      try {
        await fs.unlink(path.join(__dirname, '../uploads/blog-images', post.hero_image_filename));
        await fs.unlink(path.join(__dirname, '../uploads/blog-images', 'optimized-' + post.hero_image_filename));
      } catch (error) {
        console.warn('Failed to delete hero image:', error);
      }
    }
    
    res.json({ message: 'Blog post deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

// Handle preflight OPTIONS request for blog images
router.options('/image/:filename', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.status(200).end();
});

// Upload images for blog content (TinyMCE editor)
router.post('/upload-image', authenticateToken, requireAdmin, contentUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const filename = req.file.filename;
    const imageUrl = `/api/blog/image/${filename}`;
    
    console.log('Content image uploaded:', filename);
    
    // Return the URL in TinyMCE's expected format
    res.json({ 
      location: imageUrl,
      url: imageUrl 
    });
    
  } catch (error) {
    console.error('Blog content image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Serve blog images
router.get('/image/:filename', (req, res) => {
  const { filename } = req.params;
  const imagePath = path.join(__dirname, '../uploads/blog-images', filename);
  
  // Set proper CORS headers for cross-origin image access
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cache-Control', 'public, max-age=86400');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error('Blog image error:', err);
      res.status(404).json({ error: 'Image not found' });
    }
  });
});

module.exports = router;
