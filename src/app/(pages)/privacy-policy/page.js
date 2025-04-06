import { Section, Title } from "@/components";
import { Typography, List, ListItem } from "@mui/material";

export const metadata = { title: "Privacy Policy | Christopher Salinas Jr." };

const PrivacyPolicy = () => {
  return (
    <Section sx={{ gap: 3 }}>
      <Title>Privacy Policy</Title>
      
      <Typography variant="h4" component="h2" gutterBottom>
        Last Updated: April 6, 2025
      </Typography>
      
      <Typography variant="body1" paragraph>
        This Privacy Policy describes how I collect, use, and share your personal information when you visit csalinas.dev (the &quot;Website&quot;).
      </Typography>
      
      <Typography variant="h4" component="h2" gutterBottom>
        Information I Collect
      </Typography>
      
      <Typography variant="body1" paragraph>
        When you visit the Website, I may collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device.
      </Typography>
      
      <Typography variant="body1" paragraph>
        Additionally, as you browse the Website, I may collect information about the individual web pages that you view, what websites or search terms referred you to the Website, and information about how you interact with the Website.
      </Typography>
      
      <Typography variant="h4" component="h2" gutterBottom>
        How I Use Your Information
      </Typography>
      
      <Typography variant="body1" paragraph>
        I use the information I collect to:
      </Typography>
      
      <List>
        <ListItem>Improve and optimize my Website</ListItem>
        <ListItem>Understand user preferences and trends</ListItem>
        <ListItem>Prevent fraudulent activity and improve security</ListItem>
        <ListItem>Analyze the use of my services</ListItem>
      </List>
      
      <Typography variant="h4" component="h2" gutterBottom>
        Sharing Your Information
      </Typography>
      
      <Typography variant="body1" paragraph>
        I may share your personal information with third-party service providers to help me operate my Website, such as web hosting providers, analytics services, and other service providers.
      </Typography>
      
      <Typography variant="body1" paragraph>
        I may also disclose your personal information if required by law or if I believe that such action is necessary to comply with legal obligations or protect and defend my rights or property.
      </Typography>
      
      <Typography variant="h4" component="h2" gutterBottom>
        Cookies and Tracking Technologies
      </Typography>
      
      <Typography variant="body1" paragraph>
        I use cookies and similar tracking technologies to track activity on my Website and hold certain information. Cookies are files with a small amount of data that may include an anonymous unique identifier.
      </Typography>
      
      <Typography variant="body1" paragraph>
        You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of my Website.
      </Typography>
      
      <Typography variant="h4" component="h2" gutterBottom>
        Third-Party Services
      </Typography>
      
      <Typography variant="body1" paragraph>
        My Website may contain links to other websites that are not operated by me. If you click on a third-party link, you will be directed to that third party&apos;s site. I strongly advise you to review the Privacy Policy of every site you visit.
      </Typography>
      
      <Typography variant="body1" paragraph>
        I have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
      </Typography>
      
      <Typography variant="h4" component="h2" gutterBottom>
        Data Retention
      </Typography>
      
      <Typography variant="body1" paragraph>
        I will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy.
      </Typography>
      
      <Typography variant="h4" component="h2" gutterBottom>
        Changes to This Privacy Policy
      </Typography>
      
      <Typography variant="body1" paragraph>
        I may update my Privacy Policy from time to time. I will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date.
      </Typography>
      
      <Typography variant="body1" paragraph>
        You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
      </Typography>
      
      <Typography variant="h4" component="h2" gutterBottom>
        Contact Me
      </Typography>
      
      <Typography variant="body1" paragraph>
        If you have any questions about this Privacy Policy, please contact me at:
      </Typography>
      
      <Typography variant="body1" paragraph>
        Email: contact@csalinas.dev
      </Typography>
    </Section>
  );
};

export default PrivacyPolicy;