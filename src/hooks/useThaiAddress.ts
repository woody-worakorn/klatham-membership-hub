import { useState, useEffect } from 'react';
import { Province, District, SubDistrict } from '@/types/member';

export const useThaiAddress = () => {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [subDistricts, setSubDistricts] = useState<SubDistrict[]>([]);
  const [loading, setLoading] = useState(false);

  // Load provinces on mount
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province.json');
        const data = await response.json();
        setProvinces(data);
      } catch (error) {
        console.error('Error loading provinces:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProvinces();
  }, []);

  const loadDistricts = async (provinceId: number) => {
    try {
      setLoading(true);
      const response = await fetch('https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/district.json');
      const data = await response.json();
      const filteredDistricts = data.filter((district: District) => district.province_id === provinceId);
      setDistricts(filteredDistricts);
      setSubDistricts([]); // Reset sub-districts when province changes
    } catch (error) {
      console.error('Error loading districts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubDistricts = async (districtId: number) => {
    try {
      setLoading(true);
      const response = await fetch('https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/sub_district.json');
      const data = await response.json();
      const filteredSubDistricts = data.filter((subDistrict: SubDistrict) => subDistrict.district_id === districtId);
      setSubDistricts(filteredSubDistricts);
    } catch (error) {
      console.error('Error loading sub-districts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPostalCode = (subDistrictId: number): string => {
    const subDistrict = subDistricts.find(sd => sd.id === subDistrictId);
    return subDistrict ? subDistrict.zip_code.toString() : '';
  };

  return {
    provinces,
    districts,
    subDistricts,
    loading,
    loadDistricts,
    loadSubDistricts,
    getPostalCode
  };
};