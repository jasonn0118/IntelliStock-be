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

## 🚚 Upcoming Features

- **User Management Enhancements:**
  - Improved current user endpoints and role-based access controls.
  
## 📈 Technologies Used

### Back-End
- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** TypeORM (using DataSource)
- **Authentication:** JWT (JSON Web Tokens) with Passport.js
- **OAuth:** Google OAuth 2.0 with Passport.js
- **Security:** Bcrypt for password hashing
- **Testing:** Jest

### Tools & Services
- **Version Control:** Git with GitHub
- **CI/CD:** GitHub Actions, CircleCI
- **API Documentation:** Swagger

## 🛠️ Installation

### Prerequisites
- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **PostgreSQL** database

### Clone the Repository

```bash
git clone https://github.com/jasonn0118/IntelliStock.git
cd IntelliStock