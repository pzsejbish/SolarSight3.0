import React, { useEffect } from 'react';
import PlacesAutocomplete from 'react-places-autocomplete';

const AddressInput = ({ address, setAddress, handleSelect, formData }) => {
  // Sync the address with formData.full_address when formData changes
  useEffect(() => {
    if (formData.full_address) {
      setAddress(formData.full_address);
    }
  }, [formData.full_address, setAddress]);

  return (
    <div className="address-input-container">
      <div className="label-input-wrapper">
        <label
         className="block text-sm font-medium leading-6 text-gray-900"
         htmlFor="address-input">Project Address</label>
        <PlacesAutocomplete
          value={address}
          onChange={setAddress}
          onSelect={handleSelect}
          className="location-search-input"
        >
          {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
            <div className="input-autocomplete-wrapper">
              <input
                {...getInputProps({
                  placeholder: 'Enter your Project Address',
                  className: 'block w-full rounded border-0 py-1.5 pl-5 pr-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-900 sm:text-sm sm:leading-6',
                  id: "address-input"
                })}
              />
              <div className="autocomplete-dropdown-container">
                {loading && <div>Loading...</div>}
                {suggestions.map((suggestion, index) => {
                  const className = suggestion.active
                    ? 'suggestion-item--active'
                    : 'suggestion-item';
                  const { key, ...restSuggestionProps } = getSuggestionItemProps(suggestion, { className });
                  return (
                    <div
                      key={key || `suggestion-${index}`}
                      {...restSuggestionProps}
                    >
                      <span>{suggestion.description}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </PlacesAutocomplete>
      </div>
    </div>
  );
};

export default AddressInput;
