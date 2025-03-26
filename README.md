<p align="center">
  <a href="https://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  </a>
</p>

[![GitHub license](https://img.shields.io/github/license/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/jasonn0118/IntelliStock.svg?style=social&label=Star)](https://github.com/jasonn0118/IntelliStock/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/issues)
[![GitHub forks](https://img.shields.io/github/forks/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/network)

<p align="center">
  IntelliStock is a comprehensive backend application built with NestJS, providing secure user authentication, robust PostgreSQL database integration, and seamless OAuth functionality.
</p>

## 🚀 Features

- **User Authentication:**
  - Secure signup and login using JWT.
  - Password hashing with bcrypt.
  - Protected routes ensuring data privacy.
  
- **OAuth Integration:**
  - **Google OAuth:** Allow users to authenticate using their Google accounts.
  - **GitHub OAuth:** Enable authentication through GitHub.
  
- **Role-Based Access Control (RBAC):**
  - **Admin Role:** Full access to user management and stock data.
  - **Basic User Role:** Limited access to stock information and personal portfolio.
  - Implemented `RoleGuard` to enforce permissions on protected endpoints.

- **Database Integration:**
  - Fully integrated with PostgreSQL via TypeORM.
  - Configured environment variables for secure database connections.
  - Health check endpoints to monitor database connectivity.

- **Stock Management:**
  - Stock entity with historical stock quotes.
  - Batch import of stock and historical data.
  - Scheduled tasks to update daily quotes and historical data incrementally.
  - **Top Stocks API**: Fetch top market cap stocks and top gainers.
  
- **Watchlist & Portfolio:**
  - Users can add multiple stocks to their watchlist.
  - Easily track and manage stock portfolios through upcoming Watchlist entities and endpoints.

- **LLM with RAG (Retrieval-Augmented Generation):**
  - **OpenAI Integration**: Implemented OpenAI LLM for intelligent responses.
  - **Vector Embeddings**: Added pgvector extension in PostgreSQL for similarity searches.
  - **Document Retrieval**: Store and retrieve relevant stock-related documents based on semantic search.
  - **Context-Aware AI Responses**: Use indexed embeddings to generate insightful answers from financial documents.

## 🚚 Upcoming Features

- **Implement each Stock Insight by AI** 
  - Historical price patterns and trends
  - Volume analysis and trading patterns
  - Technical indicators (RSI, MACD, Moving Averages)
  - Fundamental metrics (P/E ratio, EPS, Market Cap)
  - Industry sector performance comparison

## 📁 Project Structure

```
src/
├── document/           # Document management
├── embedding/          # AI embeddings and processing
├── stock/             # Stock market data and analysis
│   ├── scheduler/     # Automated data updates
│   ├── entities/      # Data models
│   └── dtos/          # Data transfer objects
└── app.module.ts      # Main application module
```

## 🔧 Recent Updates - March 25, 2025

### Caching System Improvements
- Implemented intelligent caching system with midnight EST refresh
- Added automatic cache refresh for market summary and top stocks data
- Optimized API response times with in-memory caching
- Enhanced system performance and reduced external API calls

### AI Market Analysis
- Added AI-powered market analysis to the market summary API
- Implemented detailed sentiment analysis of market conditions
- Enhanced market insights with technical indicators and trading recommendations
- Integrated OpenAI GPT-4o model for professional financial analysis
- Structured JSON response format for easy frontend consumption

### Document Management
- Enhanced document entity with new fields:
  - Type and category classification
  - Date and content date tracking
  - Ticker association
  - Source attribution
  - Reliability scoring
- Improved document filtering and querying capabilities
- Added support for various document types

### AI/ML Improvements
- Enhanced embeddings service for better document processing
- Improved conversation history management
- Added context-aware response generation
- Better handling of user prompts and queries

### Stock Market Features
- Automated daily and historical data updates
- Comprehensive market statistics and analysis
- Improved error handling and logging
- Enhanced test coverage for critical components

### Testing Improvements
- Added comprehensive test coverage for scheduler components
- Improved error handling tests with proper mocking
- Enhanced test output with suppressed error logs
- Added test coverage for market data operations

### Code Quality
- Improved error handling across all services
- Enhanced type safety with proper DTOs
- Better code organization and modularity
- Standardized naming conventions

## 📈 Technologies Used

### Back-End
- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL (with pgvector for vector embeddings)
- **ORM:** TypeORM (using DataSource)
- **Authentication:** JWT (JSON Web Tokens) with Passport.js
- **OAuth:** Google OAuth 2.0 & Github with Passport.js
- **Security:** Bcrypt for password hashing
- **Role-Based Access:** Custom RoleGuard with NestJS decorators
- **Testing:** Jest
- **AI Integration:** OpenAI GPT-4o-mini, Vector Embeddings

### Tools & Services
- **Version Control:** Git with GitHub
- **CI:** GitHub Actions
- **API Documentation:** Swagger
- **Embedding Storage:** pgvector PostgreSQL extension

## 🛠️ Installation

### Prerequisites
- **Node.js** (v20 or higher)
- **npm** or **yarn**
- **PostgreSQL** (with pgvector extension)
- **OpenAI API Key** (for LLM integration)

### Clone the Repository

```bash
git clone https://github.com/jasonn0118/IntelliStock.git
cd IntelliStock
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

For development with watch mode:
```bash
npm run test:watch
```

For coverage report:
```bash
npm run test:cov
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

