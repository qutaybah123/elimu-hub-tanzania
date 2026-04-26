-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    school_id VARCHAR(100),
    grade VARCHAR(20),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schools Table
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    region VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('primary', 'secondary', 'both')),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects Table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    grade_level VARCHAR(20) NOT NULL,
    syllabus_year INTEGER NOT NULL,
    icon_url VARCHAR(500),
    color_hex VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Study Resources Table
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('notes', 'video', 'pdf', 'presentation', 'exercise')),
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id),
    downloads_count INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NECTA Past Papers Table
CREATE TABLE past_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    exam_type VARCHAR(50) NOT NULL CHECK (exam_type IN ('PSLE', 'CSEE', 'ACSEE')),
    region VARCHAR(100),
    paper_number VARCHAR(10),
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    questions_count INTEGER,
    uploaded_by UUID REFERENCES users(id),
    downloads_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes Table
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    time_limit INTEGER, -- in minutes
    is_published BOOLEAN DEFAULT FALSE,
    total_questions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions Table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
    marks INTEGER DEFAULT 1,
    explanation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Question Options (for multiple choice)
CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Quiz Attempts
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    time_taken INTEGER, -- in seconds
    total_questions INTEGER,
    correct_answers INTEGER,
    score DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Answers
CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES question_options(id),
    answer_text TEXT,
    is_correct BOOLEAN,
    marks_obtained INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Progress Tracking
CREATE TABLE student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    total_quizzes INTEGER DEFAULT 0,
    completed_quizzes INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    total_study_time INTEGER DEFAULT 0, -- in minutes
    last_active DATE,
    streak_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id)
);

-- Downloads Tracking
CREATE TABLE resource_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_resources_subject ON resources(subject_id);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_past_papers_subject ON past_papers(subject_id);
CREATE INDEX idx_past_papers_year ON past_papers(year);
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_student_progress_student ON student_progress(student_id);
CREATE INDEX idx_student_progress_subject ON student_progress(subject_id);

-- Insert sample subjects (Tanzania Curriculum)
INSERT INTO subjects (name, code, description, grade_level, syllabus_year) VALUES
    ('Hisabati', 'MATH01', 'Mathematics for primary and secondary levels', 'primary', 2020),
    ('Kiswahili', 'SWA01', 'Kiswahili language and literature', 'primary', 2020),
    ('English', 'ENG01', 'English language', 'primary', 2020),
    ('Sayansi', 'SCI01', 'General Science', 'primary', 2020),
    ('Jiografia', 'GEO01', 'Geography', 'secondary', 2020),
    ('Historia', 'HIS01', 'History', 'secondary', 2020),
    ('Biologia', 'BIO01', 'Biology', 'secondary', 2020),
    ('Kemia', 'CHEM01', 'Chemistry', 'secondary', 2020),
    ('Fizikia', 'PHY01', 'Physics', 'secondary', 2020);
-- Default admin account (email: admin@elimuhub.tz | password: admin123)
-- IMPORTANT: Change this password immediately after first login via Profile page
INSERT INTO users (email, password, full_name, role, is_active) VALUES
    ('admin@elimuhub.tz', '$2a$10$AIWHGrgGy5pv5z1WrpCkKOOqWL23ch57krVKdHYdtOiti19zuTyga', 'System Admin', 'admin', true)
ON CONFLICT (email) DO NOTHING;
