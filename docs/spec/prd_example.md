# Product Requirements Document (PRD)

## Product Name: TaskMaster

TaskMaster is a web application designed for busy entrepreneurs to effortlessly capture, format, and share their content ideas across multiple social media platforms. By simply entering raw text (and optionally uploading an image), users can leverage pre-defined templates powered by an LLM to generate polished, platform-specific content (starting with LinkedIn and Twitter). The application provides styled previews that mimic the final look on each platform and enables one-click publishing through OAuth integrations, saving time while amplifying marketing efforts.

## 2. Problem & Users

**Problem:**  
Users need a simple task management tool that works on mobile without complexity.

**Target Users:**  
Small teams (5-10 people) and individual professionals managing daily tasks.

---

## 3. Features

**Task Management:**

- Create, edit, delete tasks
- Add due dates and tags
- Mark tasks complete
- Simple list view

**User Authentication:**

- Basic login/signup
- OAuth (Google/GitHub)

**Task Sharing:**

- Share tasks with team members
- Basic assignment functionality

**Notifications:**

- Due date reminders
- Email notifications

## 4. Core User Flow (User Stories)

**Create Task:**

1. User clicks "New Task" button
2. Enters task title and optional due date
3. Clicks "Save"
4. Task appears in list

**Share Task:**

1. User opens task details
2. Clicks "Share" and selects team member
3. Team member receives email notification
4. Task appears in their list

## User Interface
- **Dashboard:**
  - A clean, intuitive central dashboard for accessing all features (content input, preview, editing, and publishing).
  
- **Content Creation Screen:**
  - A prominent text input area with an option to upload images.
  - A side-by-side preview panel displaying the generated content styled as LinkedIn and Twitter posts.
  
- **Editing Interface:**
  - In-line editing tools that allow users to make quick adjustments to the generated content.
  
- **Publishing Controls:**
  - Clear buttons for connecting social media accounts via OAuth.
  - A unified "Publish" button to send content to all connected platforms simultaneously.
  
- **Responsive Design:**
  - Initially optimized for desktop use, with plans for future responsiveness to accommodate mobile and tablet views.

