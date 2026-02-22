import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Info,
    FileText,
    Ship,
    Package,
    Truck,
    MapPin,
    Box,
    ArrowLeft,
    Save,
    X,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { JobReference } from '../../types';
import {
    jobReferencesApi,
    customersApi,
    consigneesApi,
    salesmenApi,
    jobTitlesApi,
} from '../../services/api';
import TabNav from '../../components/common/TabNav';
import InfoTab from './tabs/InfoTab';
import JobRefTab from './tabs/JobRefTab';
import ShipmentTab from './tabs/ShipmentTab';
import CargoTab from './tabs/CargoTab';
import TransportTab from './tabs/TransportTab';
import DeliveryTab from './tabs/DeliveryTab';
import FclLclTab from './tabs/FclLclTab';

interface DropdownOption {
    value: string;
    label: string;
}

const JobReferenceForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [activeTab, setActiveTab] = useState('info');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<JobReference>>({
        direction: 'Import',
        modeOfTransport: 'Sea',
        jobCategory: 'International',
        fclLcl: 'FCL',
        isHazardous: false,
        commercialInvoiceCurrency: 'SAR',
        containers: [],
        totalPayableCost: 0,
        containerDetention: 0,
        estimatedCost: 0,
        shipmentProcessCost: 0,
    });

    const [clientOptions, setClientOptions] = useState<DropdownOption[]>([]);
    const [consigneeOptions, setConsigneeOptions] = useState<DropdownOption[]>([]);
    const [salesmenOptions, setSalesmenOptions] = useState<DropdownOption[]>([]);
    const [jobTitleOptions, setJobTitleOptions] = useState<DropdownOption[]>([]);
    const [clientsRaw, setClientsRaw] = useState<any[]>([]);
    const [consigneesRaw, setConsigneesRaw] = useState<any[]>([]);

    // Load dropdown data on mount
    useEffect(() => {
        Promise.all([
            customersApi.getAll(),
            consigneesApi.getAll(),
            salesmenApi.getAll(),
            jobTitlesApi.getAll(),
        ]).then(
            ([clientData, consigneeData, salesmanData, jobTitleData]) => {
                const clientList = Array.isArray(clientData) ? clientData : [];
                const consigneeList = Array.isArray(consigneeData) ? consigneeData : [];
                const salesmanList = Array.isArray(salesmanData) ? salesmanData : [];
                const jobTitleList = Array.isArray(jobTitleData) ? jobTitleData : [];
                setClientOptions(
                    clientList.map((c: any) => ({ value: c.id, label: c.name }))
                );
                setConsigneeOptions(
                    consigneeList.map((c: any) => ({ value: c.id, label: c.name }))
                );
                setSalesmenOptions(
                    salesmanList.map((s: any) => ({ value: s.id, label: s.name }))
                );
                setJobTitleOptions(
                    jobTitleList.map((jt: any) => ({ value: jt.id, label: jt.name }))
                );
                setClientsRaw(clientList);
                setConsigneesRaw(consigneeList);
            }
        ).catch((err) => {
            console.error('Failed to load dropdown data:', err);
        });
    }, []);

    // Load existing job reference if editing
    useEffect(() => {
        if (id) {
            setLoading(true);
            jobReferencesApi.getById(id).then((data) => {
                if (data) {
                    setFormData(data);
                }
                setLoading(false);
            }).catch((err) => {
                console.error('Failed to load job reference:', err);
                setLoading(false);
            });
        }
    }, [id]);

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const buildPayload = () => {
        const payload: any = {};

        // Job number — send if user entered one, otherwise backend auto-generates sequentially
        if (formData.jobRefNo) payload.jobNumber = formData.jobRefNo;
        if (formData.status) payload.status = formData.status;
        if (formData.clientId) payload.clientId = formData.clientId;
        if (formData.consigneeId) payload.consigneeId = formData.consigneeId;

        // Client authorization/import/export fields -> Prisma names
        if (formData.clientAuthNumber) payload.authorizationNumber = formData.clientAuthNumber;
        if (formData.clientImportNumber) payload.importNumber = formData.clientImportNumber;
        if (formData.clientExportNumber) payload.exportNumber = formData.clientExportNumber;

        // DateTime fields - convert date strings to ISO DateTime
        if (formData.clientAuthExpiry) payload.authorizationExpiry = new Date(formData.clientAuthExpiry).toISOString();
        if (formData.clientImportExpiry) payload.importExpiry = new Date(formData.clientImportExpiry).toISOString();
        if (formData.clientExportExpiry) payload.exportExpiry = new Date(formData.clientExportExpiry).toISOString();

        // Job Reference tab mappings
        // jobCategory is a text value (International/Domestic), not a FK ID — skip categoryId
        if (formData.jobTitleId) payload.titleId = formData.jobTitleId;
        if (formData.fclLcl) payload.fclLclType = formData.fclLcl;
        if (formData.awbBlStatus) payload.blStatus = formData.awbBlStatus;

        // Shipment tab mappings
        if (formData.portOfLoading) payload.pol = formData.portOfLoading;
        if (formData.portOfDischarge) payload.pod = formData.portOfDischarge;
        if (formData.shipperName) payload.shipper = formData.shipperName;

        // Cargo tab mappings
        if (formData.commercialInvoiceCurrency) payload.commercialCurrency = formData.commercialInvoiceCurrency;
        if (formData.manifestNo) payload.manifestNumber = formData.manifestNo;
        if (formData.numberOfPackages != null) payload.packages = formData.numberOfPackages;
        if (formData.numberOfPallets != null) payload.pallets = formData.numberOfPallets;

        // Transport tab mappings
        if (formData.shipsName) payload.shipName = formData.shipsName;
        if (formData.shipsNumber) payload.shipNumber = formData.shipsNumber;
        if (formData.airlines) payload.airline = formData.airlines;
        if (formData.truckNumber) payload.truckPlate = formData.truckNumber;
        if (formData.driverMobile) payload.driverPhone = formData.driverMobile;

        // Delivery tab mappings
        if (formData.contactPersonName) payload.deliveryContact = formData.contactPersonName;

        // Notes - use transportRemarks if notes is empty
        if (formData.notes) payload.notes = formData.notes;
        else if (formData.transportRemarks) payload.notes = formData.transportRemarks;

        // Direct pass-through fields (names match between frontend and Prisma)
        const directFields = [
            'direction', 'modeOfTransport', 'isHazardous',
            'origin', 'destination', 'freightForwarder', 'salesmanId',
            'awbBl', 'hawbHbl', 'mabl',
            'commercialInvoiceNo', 'commercialInvoiceValue',
            'cbm', 'grossWeight', 'netWeight',
            'imoNumber', 'flightNumber', 'driverName',
            'placeOfDelivery', 'deliveryAddress',
        ];
        for (const field of directFields) {
            const value = (formData as any)[field];
            if (value !== undefined && value !== null && value !== '') {
                payload[field] = value;
            }
        }

        // deliveryDate is a DateTime in Prisma
        if ((formData as any).deliveryDate) {
            payload.deliveryDate = new Date((formData as any).deliveryDate).toISOString();
        }

        return payload;
    };

    const handleSubmit = async () => {
        try {
            const payload = buildPayload();
            if (isEditing && id) {
                await jobReferencesApi.update(id, payload);
                toast.success(`Job Reference ${payload.jobNumber} updated successfully!`, {
                    style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
                });
            } else {
                await jobReferencesApi.create(payload);
                toast.success('Job Reference created successfully!', {
                    style: { borderRadius: '12px', background: '#10b981', color: '#fff' },
                });
            }
            navigate('/job-reference');
        } catch (error) {
            toast.error('Failed to save job reference. Please try again.', {
                style: { borderRadius: '12px', background: '#ef4444', color: '#fff' },
            });
        }
    };

    const handleClose = () => {
        navigate('/job-reference');
    };

    const tabs = [
        { key: 'info', label: 'Info', icon: <Info className="h-4 w-4" /> },
        { key: 'jobref', label: 'Job Reference', icon: <FileText className="h-4 w-4" /> },
        { key: 'shipment', label: 'Shipment Details', icon: <Ship className="h-4 w-4" /> },
        { key: 'cargo', label: 'Cargo Information', icon: <Package className="h-4 w-4" /> },
        { key: 'transport', label: 'Transportation Details', icon: <Truck className="h-4 w-4" /> },
        { key: 'delivery', label: 'Delivery Info', icon: <MapPin className="h-4 w-4" /> },
        { key: 'fcllcl', label: 'FCL/LCL Details', icon: <Box className="h-4 w-4" /> },
    ];

    const tabKeys = tabs.map((t) => t.key);
    const currentTabIndex = tabKeys.indexOf(activeTab);
    const isFirstTab = currentTabIndex === 0;
    const isLastTab = currentTabIndex === tabKeys.length - 1;

    const handlePreviousTab = () => {
        if (!isFirstTab) {
            setActiveTab(tabKeys[currentTabIndex - 1]);
        }
    };

    const handleNextTab = () => {
        if (!isLastTab) {
            setActiveTab(tabKeys[currentTabIndex + 1]);
        }
    };

    const tabProps = {
        data: formData,
        onChange: handleChange,
        clients: clientOptions,
        consignees: consigneeOptions,
        salesmen: salesmenOptions,
        jobTitles: jobTitleOptions,
        clientsRaw,
        consigneesRaw,
    };

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'info':
                return <InfoTab {...tabProps} />;
            case 'jobref':
                return <JobRefTab {...tabProps} />;
            case 'shipment':
                return <ShipmentTab {...tabProps} />;
            case 'cargo':
                return <CargoTab {...tabProps} />;
            case 'transport':
                return <TransportTab {...tabProps} />;
            case 'delivery':
                return <DeliveryTab {...tabProps} />;
            case 'fcllcl':
                return <FclLclTab {...tabProps} />;
            default:
                return <InfoTab {...tabProps} />;
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 skeleton rounded-xl" />
                    <div className="space-y-2">
                        <div className="h-6 w-64 skeleton rounded" />
                        <div className="h-4 w-40 skeleton rounded" />
                    </div>
                </div>
                <div className="h-12 skeleton rounded-xl" />
                <div className="h-96 skeleton rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/job-reference')}
                        className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {isEditing ? 'Edit Job Reference' : 'Add Job Reference'}
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">
                            {isEditing
                                ? `Editing ${formData.jobRefNo || ''}`
                                : 'Create a new job reference with all required details.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation & Content */}
            <div className="card-premium overflow-hidden">
                <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                <div className="p-6 md:p-8">{renderActiveTab()}</div>
            </div>

            {/* Bottom Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {!isFirstTab && (
                        <button onClick={handlePreviousTab} className="btn-secondary">
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleClose} className="btn-secondary">
                        <X className="h-4 w-4" />
                        Close
                    </button>
                    {isLastTab ? (
                        <button onClick={handleSubmit} className="btn-primary">
                            <Save className="h-4 w-4" />
                            {isEditing ? 'Update' : 'Submit'}
                        </button>
                    ) : (
                        <button onClick={handleNextTab} className="btn-primary">
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobReferenceForm;
