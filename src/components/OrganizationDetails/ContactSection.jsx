import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import EmailSection from './contact/EmailSection';
import PhoneSection from './contact/PhoneSection';
import AddressSection from './contact/AddressSection';

const ContactSection = ({ contacts, editMode, onAdd, onEdit, onDelete }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <EmailSection 
          emails={contacts.emails}
          editMode={editMode}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </Grid>
      
      <Grid item xs={12}>
        <AddressSection 
          addresses={contacts.addresses}
          editMode={editMode}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </Grid>
      
      <Grid item xs={12}>
        <PhoneSection 
          phones={contacts.phones}
          editMode={editMode}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </Grid>
    </Grid>
  );
};

ContactSection.propTypes = {
  contacts: PropTypes.shape({
    emails: PropTypes.arrayOf(PropTypes.shape({
      fieldData: PropTypes.shape({
        __ID: PropTypes.string.isRequired,
        email: PropTypes.string.isRequired,
        label: PropTypes.string,
        f_primary: PropTypes.string
      }).isRequired
    })),
    addresses: PropTypes.arrayOf(PropTypes.shape({
      fieldData: PropTypes.shape({
        __ID: PropTypes.string.isRequired,
        streetAddress: PropTypes.string.isRequired,
        unitNumber: PropTypes.string,
        city: PropTypes.string.isRequired,
        prov: PropTypes.string.isRequired,
        country: PropTypes.string,
        postalCode: PropTypes.string.isRequired,
        label: PropTypes.string
      }).isRequired
    })),
    phones: PropTypes.arrayOf(PropTypes.shape({
      fieldData: PropTypes.shape({
        __ID: PropTypes.string.isRequired,
        phone: PropTypes.string.isRequired,
        label: PropTypes.string,
        f_primary: PropTypes.string
      }).isRequired
    }))
  }).isRequired,
  editMode: PropTypes.bool.isRequired,
  onAdd: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default ContactSection;
