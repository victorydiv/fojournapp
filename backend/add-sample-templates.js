const { pool } = require('./config/database');

async function addSampleTemplates() {
  try {
    console.log('Adding sample template checklists...');
    const connection = await pool.getConnection();
    
    // First, create a sample user for templates if it doesn't exist
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      ['template_creator']
    );
    
    let templateUserId;
    if (existingUser.length === 0) {
      console.log('Creating template creator user...');
      const [userResult] = await connection.execute(
        `INSERT INTO users (username, email, password_hash, first_name, last_name) 
         VALUES (?, ?, ?, ?, ?)`,
        ['template_creator', 'templates@fojournapp.com', '$2b$10$dummy.hash.for.template.user', 'Template', 'Creator']
      );
      templateUserId = userResult.insertId;
    } else {
      templateUserId = existingUser[0].id;
    }
    
    console.log('Adding sample template checklists...');
    
    const templates = [
      {
        title: 'International Travel Packing Checklist',
        description: 'Complete packing checklist for international trips including documents, electronics, and essentials.',
        category: 'packing',
        color: '#FF6B6B',
        items: [
          { text: 'Passport (valid for 6+ months)', category: 'documents', priority: 'high' },
          { text: 'Visa (if required)', category: 'documents', priority: 'high' },
          { text: 'Travel insurance documents', category: 'documents', priority: 'high' },
          { text: 'Flight tickets / boarding passes', category: 'documents', priority: 'high' },
          { text: 'Hotel confirmations', category: 'documents', priority: 'medium' },
          { text: 'Driver\'s license / International permit', category: 'documents', priority: 'medium' },
          { text: 'Phone charger and adapters', category: 'electronics', priority: 'high' },
          { text: 'Camera and memory cards', category: 'electronics', priority: 'medium' },
          { text: 'Portable battery pack', category: 'electronics', priority: 'medium' },
          { text: 'Clothes for each day + 2 extra', category: 'clothing', priority: 'high' },
          { text: 'Comfortable walking shoes', category: 'clothing', priority: 'high' },
          { text: 'Weather-appropriate outerwear', category: 'clothing', priority: 'medium' },
          { text: 'Toiletries and medications', category: 'personal', priority: 'high' },
          { text: 'First aid kit', category: 'personal', priority: 'medium' },
          { text: 'Sunscreen and sunglasses', category: 'personal', priority: 'medium' }
        ]
      },
      {
        title: 'Road Trip Planning Checklist',
        description: 'Essential checklist for planning an epic road trip adventure.',
        category: 'planning',
        color: '#4ECDC4',
        items: [
          { text: 'Plan route and stops', category: 'planning', priority: 'high' },
          { text: 'Book accommodations', category: 'planning', priority: 'high' },
          { text: 'Check vehicle maintenance', category: 'planning', priority: 'high' },
          { text: 'Download offline maps', category: 'planning', priority: 'medium' },
          { text: 'Research local attractions', category: 'planning', priority: 'medium' },
          { text: 'Pack emergency car kit', category: 'safety', priority: 'high' },
          { text: 'Bring jumper cables', category: 'safety', priority: 'medium' },
          { text: 'Pack spare tire and tools', category: 'safety', priority: 'high' },
          { text: 'Road trip snacks and drinks', category: 'food', priority: 'medium' },
          { text: 'Entertainment (music, podcasts)', category: 'entertainment', priority: 'low' },
          { text: 'Travel games and books', category: 'entertainment', priority: 'low' },
          { text: 'Car phone mount', category: 'electronics', priority: 'medium' },
          { text: 'Car chargers for devices', category: 'electronics', priority: 'high' }
        ]
      },
      {
        title: 'Beach Vacation Essentials',
        description: 'Everything you need for the perfect beach getaway.',
        category: 'packing',
        color: '#45B7D1',
        items: [
          { text: 'Swimwear (2-3 sets)', category: 'clothing', priority: 'high' },
          { text: 'Beach towels', category: 'beach', priority: 'high' },
          { text: 'Sunscreen (SPF 30+)', category: 'beach', priority: 'high' },
          { text: 'Sun hat and sunglasses', category: 'beach', priority: 'high' },
          { text: 'Beach bag', category: 'beach', priority: 'medium' },
          { text: 'Flip flops / water shoes', category: 'clothing', priority: 'high' },
          { text: 'Waterproof phone case', category: 'electronics', priority: 'medium' },
          { text: 'Beach umbrella or tent', category: 'beach', priority: 'medium' },
          { text: 'Snorkel gear (if needed)', category: 'activities', priority: 'low' },
          { text: 'Beach games (volleyball, frisbee)', category: 'activities', priority: 'low' },
          { text: 'Cooler for drinks', category: 'beach', priority: 'medium' },
          { text: 'After-sun lotion', category: 'personal', priority: 'medium' },
          { text: 'Light evening clothes', category: 'clothing', priority: 'medium' }
        ]
      },
      {
        title: 'Business Trip Checklist',
        description: 'Professional travel checklist for business trips and conferences.',
        category: 'planning',
        color: '#96CEB4',
        items: [
          { text: 'Business cards', category: 'business', priority: 'high' },
          { text: 'Laptop and charger', category: 'electronics', priority: 'high' },
          { text: 'Phone charger', category: 'electronics', priority: 'high' },
          { text: 'Presentation materials', category: 'business', priority: 'high' },
          { text: 'Business attire', category: 'clothing', priority: 'high' },
          { text: 'Comfortable shoes', category: 'clothing', priority: 'medium' },
          { text: 'Travel-sized toiletries', category: 'personal', priority: 'medium' },
          { text: 'Expense tracking app/receipts', category: 'business', priority: 'medium' },
          { text: 'Conference agenda', category: 'business', priority: 'medium' },
          { text: 'Notebook and pens', category: 'business', priority: 'medium' },
          { text: 'Portable WiFi hotspot', category: 'electronics', priority: 'low' },
          { text: 'Business casual outfit', category: 'clothing', priority: 'low' }
        ]
      },
      {
        title: 'Camping Adventure Checklist',
        description: 'Complete checklist for outdoor camping trips and adventures.',
        category: 'activities',
        color: '#FFEAA7',
        items: [
          { text: 'Tent and stakes', category: 'shelter', priority: 'high' },
          { text: 'Sleeping bag and pillow', category: 'shelter', priority: 'high' },
          { text: 'Camping stove and fuel', category: 'cooking', priority: 'high' },
          { text: 'Matches/lighter in waterproof container', category: 'cooking', priority: 'high' },
          { text: 'Food and snacks', category: 'food', priority: 'high' },
          { text: 'Water bottles and purification tablets', category: 'food', priority: 'high' },
          { text: 'First aid kit', category: 'safety', priority: 'high' },
          { text: 'Flashlight and extra batteries', category: 'safety', priority: 'high' },
          { text: 'Multi-tool or knife', category: 'tools', priority: 'medium' },
          { text: 'Rope/paracord', category: 'tools', priority: 'medium' },
          { text: 'Insect repellent', category: 'personal', priority: 'medium' },
          { text: 'Weather-appropriate clothing', category: 'clothing', priority: 'high' },
          { text: 'Rain gear', category: 'clothing', priority: 'medium' },
          { text: 'Hiking boots', category: 'clothing', priority: 'high' },
          { text: 'Trash bags (Leave No Trace)', category: 'environment', priority: 'medium' }
        ]
      }
    ];
    
    for (const template of templates) {
      console.log(`Creating template: ${template.title}`);
      
      // Check if template already exists
      const [existing] = await connection.execute(
        'SELECT id FROM checklists WHERE title = ? AND user_id = ?',
        [template.title, templateUserId]
      );
      
      if (existing.length > 0) {
        console.log(`Template "${template.title}" already exists, skipping...`);
        continue;
      }
      
      // Create the checklist
      const [checklistResult] = await connection.execute(
        `INSERT INTO checklists (user_id, title, description, category, color, is_template, is_public, usage_count) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [templateUserId, template.title, template.description, template.category, template.color, true, true, Math.floor(Math.random() * 50) + 10]
      );
      
      const checklistId = checklistResult.insertId;
      
      // Add items to the checklist
      for (let i = 0; i < template.items.length; i++) {
        const item = template.items[i];
        await connection.execute(
          `INSERT INTO checklist_items (checklist_id, text, category, priority, sort_order) 
           VALUES (?, ?, ?, ?, ?)`,
          [checklistId, item.text, item.category, item.priority, i + 1]
        );
      }
      
      console.log(`✅ Created template "${template.title}" with ${template.items.length} items`);
    }
    
    connection.release();
    console.log('✅ All sample templates created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating sample templates:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addSampleTemplates()
    .then(() => {
      console.log('Sample templates added successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to add sample templates:', error);
      process.exit(1);
    });
}

module.exports = { addSampleTemplates };
