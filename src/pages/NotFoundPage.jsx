import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="notfound-container">
      <div className="notfound-content">
        <h1 className="notfound-code">404</h1>
        <h2 className="notfound-title">אופס! הדף לא נמצא</h2>
        <p className="notfound-subtitle">הדף שחיפשתם לא קיים או הוסר</p>
        <Link to="/" className="notfound-btn">
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
}
