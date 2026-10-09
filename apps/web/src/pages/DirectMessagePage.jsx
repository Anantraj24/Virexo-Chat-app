import { useParams } from 'react-router-dom';
import { ChatLayout } from '../components/ChatLayout';

export function DirectMessagePage() {
  const { id } = useParams();
  return <ChatLayout key={id} />;
}