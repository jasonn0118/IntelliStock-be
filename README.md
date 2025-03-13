<p align="center">
  <a href="https://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  </a>
</p>

[![GitHub license](https://img.shields.io/github/license/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/jasonn0118/IntelliStock.svg?style=social&label=Star)](https://github.com/jasonn0118/IntelliStock/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/issues)
[![GitHub forks](https://img.shields.io/github/forks/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/network)
[![CircleCI](https://img.shields.io/circleci/build/github/jasonn0118/IntelliStock/master)](https://circleci.com/gh/jasonn0118/IntelliStock)

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
  
- **Watchlist & Portfolio:**
  - Users can add multiple stocks to their watchlist.
  - Easily track and manage stock portfolios through upcoming Watchlist entities and endpoints.

- **LLM with RAG (Retrieval-Augmented Generation):**
  - **OpenAI Integration**: Implemented OpenAI LLM for intelligent responses.
  - **Vector Embeddings**: Added pgvector extension in PostgreSQL for similarity searches.
  - **Document Retrieval**: Store and retrieve relevant stock-related documents based on semantic search.
  - **Context-Aware AI Responses**: Use indexed embeddings to generate insightful answers from financial documents.

## 🚚 Upcoming Features

- **User Management Enhancements:**
  - Expanded role-based access controls with additional permission levels.
  
- **Enhanced AI Financial Insights:**
  - Improve stock predictions using RAG-based retrieval of financial documents.
  - Implement financial document summarization for stock trends analysis.

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
