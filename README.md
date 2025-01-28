<p align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[![GitHub license](https://img.shields.io/github/license/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/jasonn0118/IntelliStock.svg?style=social&label=Star)](https://github.com/jasonn0118/IntelliStock/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/issues)
[![GitHub forks](https://img.shields.io/github/forks/jasonn0118/IntelliStock.svg)](https://github.com/jasonn0118/IntelliStock/network)
[![CircleCI](https://img.shields.io/circleci/build/github/jasonn0118/IntelliStock/master)](https://circleci.com/gh/jasonn0118/IntelliStock)

<p align="center">IntelliStock is a comprehensive backend application built with NestJS, providing secure user authentication and robust PostgreSQL database integration.</p>

## 🚀 Features

- **User Authentication:**
  - Secure signup and login using JWT.
  - Password hashing with bcrypt.
  - Protected routes ensuring data privacy.

- **Database Integration:**
  - Connected NestJS backend with PostgreSQL using TypeORM's `DataSource`.
  - Configured environment variables for secure database connections.
  - Implemented health check endpoint to monitor database connectivity.

## 📈 Technologies Used

### Back-End
- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** TypeORM (using `DataSource`)
- **Authentication:** JWT (JSON Web Tokens) with Passport.js
- **Security:** Bcrypt for password hashing
- **Testing:** Jest, Supertest

### Tools & Services
- **Version Control:** Git with GitHub
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