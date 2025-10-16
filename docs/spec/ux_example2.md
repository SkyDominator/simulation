# Levercast User Interface Design Document

This document outlines the final UI design for Levercast, incorporating a bold, creative dark mode with a yellow accent color and an option to switch to light mode for enhanced accessibility. The design leverages a collapsible left-hand navigation sidebar and a dynamic main content area that adapts based on user interactions.

---

## Layout Structure

- **Overall Layout:**  
  The interface is divided into two primary areas:  
  - **Left-Hand Sidebar (Navigation):** A collapsible panel that hosts all primary navigation elements.  
  - **Main Content Area:** A dynamic area that displays the content corresponding to the selected navigation item.

- **Left-Hand Sidebar:**  
  - Contains navigation links for:
    - **New Post:** Opens the content creation screen.
    - **Recent Posts:** Displays a list or grid of past posts (with status indicators such as draft, pending, or published).
    - **Settings:** Provides access to user and app configuration options.
    - **Templates:** Displays available content formatting templates.
  - The bottom left of the sidebar features the **Profile Icon**; clicking it opens a dropdown for logout.

- **Main Content Area:**  
  - Dynamically updates based on the selected sidebar option.
  - Houses content creation screens, previews, editing interfaces, and publishing controls.
  - Designed for real-time interactions and updates, especially for content formatting and social media previews.

- **Theme Toggle:**  
  - A clearly accessible toggle control (placed within the header or settings) allows users to switch between dark mode (default) and light mode.

---

## Core Components

- **Collapsible Left-Hand Navigation Sidebar:**
  - **Navigation Items:** "New Post", "Recent Posts", "Settings", and "Templates".
  - **Profile Icon:** Located at the bottom left, facilitating quick logout access.
  - **Collapse/Expand Feature:** Enhances screen real estate management.

- **Main Content Area Components:**
  - **Content Creation Screen:**  
    - A large text input field for raw content ideas.
    - An option to upload images.
    - Real-time previews of content formatted for social media (e.g., LinkedIn and Twitter) with inline editing capabilities.
  - **Recent Posts Display:**  
    - A list or grid view of past content with visual indicators of status (draft, pending, published).
  - **Settings & Templates Screens:**  
    - Configurable options and a list of available LLM-powered content templates.
  - **Publishing Controls:**  
    - OAuth integrations for social media accounts.
    - A one-click publish button to post to all connected platforms.

- **Theme Toggle Component:**  
  - Enables users to switch between dark and light modes, ensuring visual accessibility without compromising on design integrity.

---

## Interaction Patterns

- **Sidebar Navigation:**
  - **Collapsible Behavior:** Users can collapse or expand the sidebar for a focused view of the main content.
  - **Dynamic Content Loading:** Clicking any navigation item (e.g., New Post, Recent Posts, Settings, Templates) updates the main content area accordingly.
  - **Profile Dropdown:** Clicking the profile icon triggers a dropdown with logout options.

- **Content Creation & Editing:**
  - **Real-Time Preview:** As users input text and upload images, previews update instantly to reflect changes.
  - **Inline Editing:** Enables users to adjust formatted content directly within the preview panels.
  - **Modal Interactions:** For more detailed editing or additional options, modal dialogs provide focused interaction windows.

- **Theme Switching:**
  - **Toggle Control:** Users can switch between dark mode and light mode with a single click, ensuring readability and personal preference adherence.
  - **Consistent Feedback:** Visual cues (e.g., hover states, active states) indicate interactive elements and current selections.

- **Publishing Flow:**
  - **OAuth Integration:** Clear, direct buttons facilitate account connection.
  - **Unified Publish Button:** Initiates one-click publishing across all linked social media platforms.

---

## Visual Design Elements & Color Scheme

- **Dark Mode (Default):**
  - **Background:** Deep, dark shades to reduce eye strain and emphasize content.
  - **Accent Color:** A vibrant yellow is used to highlight primary actions (buttons, links, icons) and interactive elements.
  - **Visual Hierarchy:** Bold visuals with subtle gradients and shadows to create depth without sacrificing clarity.

- **Light Mode:**
  - **Background:** A clean, light palette that maintains the same accent yellow for consistency.
  - **Text and Elements:** Darker text and elements to ensure high readability against the lighter background.

- **Sidebar & Main Content Contrast:**
  - The sidebar features a slightly different tone from the main content area to delineate navigation from content.
  - Icons and labels are clear and modern, reinforcing the interface's intuitive use.

---

## Typography

- **Primary Font:**  
  - A modern sans-serif typeface (e.g., Roboto, Helvetica Neue) for a clean, contemporary look.
- **Font Hierarchy:**  
  - **Headings & Buttons:** Bold weights to draw attention.
  - **Body Text:** Regular weights for comfortable reading.
  - **Adaptive Sizing:** Font sizes are chosen for legibility across various devices, with responsive scaling for desktop and future mobile views.

---

## Accessibility

- **Contrast and Color:**
  - High contrast between text and background in both dark and light modes.
  - The accent yellow is used judiciously to ensure clarity without overwhelming the interface.
- **Keyboard Navigation:**
  - All interactive elements, including the sidebar, toggle switches, and buttons, are fully navigable via keyboard.
- **Screen Reader Support:**
  - ARIA labels and clear text alternatives for icons ensure compatibility with assistive technologies.
- **Adjustable Settings:**
  - Options for text scaling and other customizable accessibility features are integrated within the Settings screen.
- **Responsive Interactions:**
  - Visual feedback (e.g., focus states, hover effects) is provided to enhance the usability of interactive components for all users.

---

*This design ensures that Levercast is both visually engaging and functionally robust, providing busy entrepreneurs and content creators with an intuitive, accessible, and efficient tool for social media content management.*
