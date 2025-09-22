# Node.js Management for Shared Hosting (No Sudo)

## Problem
Shared hosting providers like DreamHost don't allow sudo access, making traditional Node.js upgrades impossible. You need to manage Node.js versions locally in your user space.

## Solution: Node Version Manager (NVM)

NVM allows you to install and manage multiple Node.js versions without root access.

### Installation Steps

1. **Install NVM (if not already installed)**
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Reload your shell
   source ~/.bashrc
   # or
   source ~/.profile
   ```

2. **Verify NVM Installation**
   ```bash
   nvm --version
   ```

3. **List Available Node.js Versions**
   ```bash
   nvm list-remote --lts
   ```

4. **Install Node.js 18 LTS**
   ```bash
   nvm install 18
   nvm use 18
   nvm alias default 18
   ```

5. **Verify Installation**
   ```bash
   node --version  # Should show v18.x.x
   npm --version   # Should show compatible npm version
   ```

### Using Different Node.js Versions

```bash
# Install multiple versions
nvm install 16
nvm install 18
nvm install 20

# List installed versions
nvm list

# Switch between versions
nvm use 16
nvm use 18

# Set default version
nvm alias default 18
```

### For Your Application

1. **Navigate to your app directory**
   ```bash
   cd ~/fojourn.site/fojournapp/backend
   ```

2. **Use Node.js 18**
   ```bash
   nvm use 18
   ```

3. **Reinstall dependencies**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Update PM2 to use new Node.js version**
   ```bash
   # Stop current application
   pm2 stop fojourn-travel-log
   
   # Delete old PM2 process
   pm2 delete fojourn-travel-log
   
   # Start with new Node.js version
   pm2 start server.js --name fojourn-travel-log
   
   # Save PM2 configuration
   pm2 save
   ```

### Alternative: Direct Node.js Installation

If NVM isn't available, you can install Node.js directly to your home directory:

1. **Download Node.js binary**
   ```bash
   cd ~
   wget https://nodejs.org/dist/v18.19.0/node-v18.19.0-linux-x64.tar.xz
   tar -xJf node-v18.19.0-linux-x64.tar.xz
   mv node-v18.19.0-linux-x64 nodejs18
   ```

2. **Update your PATH**
   ```bash
   echo 'export PATH=$HOME/nodejs18/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Verify installation**
   ```bash
   node --version
   npm --version
   ```

### Updating Your Management Script

Since the Node.js management won't work on shared hosting, let's create a version that works locally.