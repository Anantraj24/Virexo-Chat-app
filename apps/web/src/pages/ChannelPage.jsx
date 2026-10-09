import { useParams } from 'react-router-dom';
import { ChatLayout } from '../components/ChatLayout';

export function ChannelPage() {
  const { id } = useParams();
  return <ChatLayout key={id} />;
}