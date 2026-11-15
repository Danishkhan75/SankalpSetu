import React from 'react';
import { resolveBestImageForCaptionOrTitle } from '../utils/exportUtils';

interface CampaignArtworkProps {
  theme:
    | 'water'
    | 'education'
    | 'health'
    | 'environment'
    | 'blood_camp'
    | 'freelancer'
    | 'personal'
    | string;
  title?: string;
  caption?: string;
  className?: string;
}

export const CampaignArtwork: React.FC<CampaignArtworkProps> = ({
  theme,
  title = '',
  caption = '',
  className = '',
}) => {
  const bestImageUrl = resolveBestImageForCaptionOrTitle({
    theme,
    title,
    caption,
  });

  return (
    <img
      src={bestImageUrl}
      alt={title || `${theme} campaign showcase`}
      loading="lazy"
      className={`w-full h-full object-cover object-center ${className}`}
    />
  );
};
