<p align="center">
  <a href="https://nestjs.com/" target="_blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[![GitHub license](https://img.shields.io/github/license/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/jasonn0118/IntelliStock.svg?style=social&label=Star)](https://github.com/jasonn0118/IntelliStock/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/issues)
[![GitHub forks](https://img.shields.io/github/forks/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/network)
[![CircleCI](https://img.shields.io/circleci/build/github/jasonn0118/IntelliStock/master)](https://circleci.com/gh/jasonn0118/IntelliStock)

<p align="center">IntelliStock is a comprehensive backend application built with NestJS, providing secure user authentication, robust PostgreSQL database integration, and seamless Google OAuth functionality.</p>

## 🚀 Features

- **User Authentication:**
  - Secure signup and login using JWT.
  - Password hashing with bcrypt.
  - Protected routes ensuring data privacy.
  
- **OAuth Integration:**
  - **Google OAuth:** Allow users to authenticate using their Google accounts.
  - **GitHub OAuth:** Enable authentication through GitHub.
  
- **Database Integration:**
  - Connected NestJS backend with PostgreSQL using TypeORM's `DataSource`.
  - Configured environment variables for secure database connections.
  - Implemented health check endpoint to monitor database connectivity.

## 🚚 Upcoming Features
- **User Management:**
  - Current user check to verify and retrieve authenticated user details.
  
- **Stock and Watchlist Entities:**
  - Create Stock entities and related services and controllers for managing stock data.
  - Create Watchlist entities and related services and controllers to allow users to manage their watchlists.
  

## 📈 Technologies Used

### Back-End
- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** TypeORM (using `DataSource`)
- **Authentication:** JWT (JSON Web Tokens) with Passport.js
- **OAuth:** Google OAuth 2.0 with Passport.js
- **Security:** Bcrypt for password hashing
- **Testing:** Jest

### Tools & Services
- **Version Control:** Git with GitHub
- **CI/CD:** GitHub Actions
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
