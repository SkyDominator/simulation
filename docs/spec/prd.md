# Levercast Product Requirements Document

## Elevator Pitch
Levercast is a web application designed for busy entrepreneurs to effortlessly capture, format, and share their content ideas across multiple social media platforms. By simply entering raw text (and optionally uploading an image), users can leverage pre-defined templates powered by an LLM to generate polished, platform-specific content (starting with LinkedIn and Twitter). The application provides styled previews that mimic the final look on each platform and enables one-click publishing through OAuth integrations, saving time while amplifying marketing efforts.

## Who is this App For
- **Entrepreneurs and Business Owners:** Individuals who need a quick, streamlined way to capture ideas and publish them across social media.
- **Content Creators and Marketers:** Professionals looking to generate tailored content for various social channels.

## Functional Requirements
- **Content Input:**
  - A text input box for quickly dumping ideas or content.
  - An option to upload an image alongside text.
- **LLM-Powered Content Formatting:**
  - Process the input using customizable template prompts.
  - Generate multiple formatted outputs for different social media platforms (initially LinkedIn and Twitter).
- **Styled Previews:**
  - Display outputs with styles that replicate the final appearance on each respective platform.
  - Provide an editing interface for users to refine the content.
- **Publishing Mechanism:**
  - Integration with social media accounts via OAuth (starting with LinkedIn and Twitter).
  - A one-click publishing feature to post directly from the application.
- **Extensibility:**
  - Ability to add more social media platforms in future versions.
  - Potential expansion to mobile-responsive or mobile-native designs later.

## User Stories
- **Idea Capture:**  
  _As an entrepreneur, I want to quickly input my raw content ideas (text and images) so that I never lose a creative spark._
  
- **Content Generation:**  
  _As a user, I want the app to convert my raw ideas into polished, platform-specific formats using templates, so that my content is immediately ready for posting._
  
- **Content Customization:**  
  _As a user, I want to preview and edit the generated content to ensure it aligns with my brand voice and meets platform-specific formatting requirements._
  
- **Content Review:**  
  _As a user, I want to be able to view all the content I've created and navigate through the pasts posts, etc. So all these will have to be saved and allow me to manage them. Also their status as to whether they were pending or drafts or published._
  
- **Multi-Platform Publishing:**  
  _As a user, I want to connect my social media accounts (LinkedIn and Twitter) via OAuth and publish content directly from the app, saving time on manual posting._
  
- **Visual Verification:**  
  _As a user, I want to see styled previews that resemble the final look on each platform, so that I can verify and adjust the formatting before publishing._

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
