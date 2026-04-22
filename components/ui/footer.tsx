import { FaDiscord, FaLinkedin } from 'react-icons/fa'
import { PiMicrosoftOutlookLogoFill } from "react-icons/pi";

const Footer = () => {
  return (
    <footer className='border-t border-foreground/10'>
      <div className='mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 max-md:flex-col sm:px-6 sm:py-6 md:gap-6 md:py-8'>
        <a href='/'>
          <div className='flex items-center gap-3'>
            <span className='text-md'>Suffolk Programming, AI & Research Club</span>
          </div>
        </a>

        <div className='flex items-center gap-4'>
          <a href='https://www.linkedin.com/company/suffolk-programming-ai-research-club' target='_blank' rel='noopener noreferrer'>
            <FaLinkedin className='size-8 hover:scale-115 hover:text-muted-foreground transition-all' />
          </a>
          <a href='https://discord.gg/W8veDYAku6' target='_blank' rel='noopener noreferrer'>
            <FaDiscord className='size-8 hover:scale-115 hover:text-muted-foreground transition-all' />
          </a>
          <a href='mailto:sparc@studentorgs.suffolk.edu' rel='noopener noreferrer'>
            <PiMicrosoftOutlookLogoFill className='size-8 hover:scale-115 hover:text-muted-foreground transition-all' />
          </a>
        </div>
      </div>

      <div className='mx-auto flex max-w-7xl justify-center px-4 lg:mt-8 mb-8 sm:px-6'>
        <p className='text-center font-medium text-balance'>
          {`© ${new Date().getFullYear()}`}
          {' '}
          SPARC. All rights reserved. 
        </p>
      </div>
    </footer>
  )
}

export { Footer }