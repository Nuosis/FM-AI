import PropTypes from 'prop-types';
import { 
  Box, 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Backdrop,
  Fade,
  styled,
  useTheme
} from '@mui/material';
import { Storage, Class } from '@mui/icons-material';

const MenuContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: '64px', // Height of bottom bar
  left: '50%',
  transform: 'translate(-50%, 0)',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[8],
  padding: theme.spacing(1),
  maxHeight: '50vh',
  overflowY: 'auto',
  zIndex: theme.zIndex.drawer + 2,
  minWidth: 200,
  animation: 'slideUp 0.3s ease-out forwards',
  '@keyframes slideUp': {
    from: {
      transform: 'translate(-50%, 100%)',
      opacity: 0
    },
    to: {
      transform: 'translate(-50%, 0)',
      opacity: 1
    }
  },
  '& .MuiListItemButton-root': {
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(0.5),
    '&:last-child': {
      marginBottom: 0
    }
  },
  '&::-webkit-scrollbar': {
    width: '4px'
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent'
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.divider,
    borderRadius: '4px'
  }
}));

const DropUpMenu = ({ 
  open, 
  onClose, 
  items, 
  onItemClick,
  currentView 
}) => {
  const theme = useTheme();

  const handleItemClick = (item) => {
    onItemClick(item);
    onClose();
  };

  return (
    <>
      <Backdrop
        open={open}
        onClick={onClose}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />
      <Fade in={open}>
        <MenuContainer onClick={(e) => e.stopPropagation()}>
          <List>
            {items.map((item) => (
              <ListItemButton 
                key={item.name}
                onClick={() => handleItemClick(item)}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  ...(item.isSpecial && (
                    (item.name === 'Register a Database' && currentView === 'database') ||
                    (item.name === 'Modules' && currentView === 'modules') ||
                    (item.name === 'Licenses' && currentView === 'licenses') ||
                    (item.name === 'Organizations' && currentView === 'organizations') ||
                    (item.name === 'Billables' && currentView === 'billables')
                  ) && {
                    backgroundColor: 'rgba(144, 202, 249, 0.16)',
                  })
                }}
              >
                <ListItemIcon sx={{ color: theme.palette.primary.main, minWidth: 36 }}>
                  {item.icon || (item.isSpecial ? <Storage fontSize="small" /> : <Class fontSize="small" />)}
                </ListItemIcon>
                <ListItemText 
                  primary={item.name}
                  primaryTypographyProps={{
                    sx: { color: theme.palette.text.secondary }
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </MenuContainer>
      </Fade>
    </>
  );
};

DropUpMenu.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    icon: PropTypes.node,
    isSpecial: PropTypes.bool,
    component: PropTypes.string
  })).isRequired,
  onItemClick: PropTypes.func.isRequired,
  currentView: PropTypes.string.isRequired
};

export default DropUpMenu;
